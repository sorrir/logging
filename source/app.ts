import * as logform from "logform";
import * as logger from "winston";
import * as Transport from "winston-transport";
import { ElasticsearchTransport, Transformer } from "winston-elasticsearch";
import { Client } from "@elastic/elasticsearch";
import * as os from "os";

export enum Stakeholder {
  USER = "USER",
  SYSTEM = "SYSTEM",
}

export type SystemContextStripped = {
  area: "execution" | "operation" | "orchestration" | "resilience" | "unknown"; // hier die Blöcke unserer Architektur
};

export type SystemContext = SystemContextStripped & {
  function: string;
  file: string;
};

export type ApplicationContext = {
  unit: string;
  component: string;
  degradationMode: string;
};

export enum LogLevel {
  info = "info",
  debug = "debug",
  warn = "warn",
  error = "error",
}

export type context<S extends Stakeholder> = {
  stakeholder: S;
  contextFields: S extends Stakeholder.USER
    ? ApplicationContext
    : SystemContext;
};

export interface LogEntry<S extends Stakeholder> extends context<S> {
  context: context<S>;
  host: string;
  data: Record<string, unknown>;
}

const metadataFormat = logform.format.metadata({
  fillWith: ["context", "host", "data"],
});

export interface SorrirLog<S extends Stakeholder> {
  (
    level: LogLevel,
    message: string,
    data: Record<string, unknown>,
    contextFields: S extends Stakeholder.USER
      ? ApplicationContext
      : SystemContextStripped
  ): logger.Logger;
}

export interface SorrirLogConfigured<S extends Stakeholder> {
  (
    level: LogLevel,
    stakeholder: S,
    message: string,
    data: Record<string, unknown>
  ): logger.Logger;
}

export interface SorrirLogLevel<S extends Stakeholder> {
  (
    stakeholder: S,
    message: string,
    data: Record<string, unknown>,
    contextFields?: S extends Stakeholder.USER
      ? ApplicationContext
      : SystemContextStripped
  ): logger.Logger;
}

export const sorrirLogger: logger.Logger = getLogger();

/**
 * The logger aqcuired by this method logs to stdout if the app runs in
 * production of if either one of SORRIR_ES_URL, SORRIR_ES_USER or SORRIR_ES_PASSWORD
 * are not set.
 * Otherwise it logs to the specified Elasticsearch instance.
 */
export function getLogger(): logger.Logger {
  let transportMethods: Transport[];
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.SORRIR_ES_URL &&
    process.env.SORRIR_ES_USER &&
    process.env.SORRIR_ES_PASSWORD
  ) {
    const esNodeUrl = process.env.SORRIR_ES_URL;
    const esAuthConfig = {
      username: process.env.SORRIR_ES_USER,
      password: process.env.SORRIR_ES_PASSWORD,
    };

    const esIndex = process.env.SORRIR_ES_INDEX;
    const esIndexPrefix = process.env.SORRIR_ES_INDEX_PREFIX
      ? process.env.SORRIR_ES_INDEX_PREFIX
      : "filebeat-debug";

    const esContextDebug = process.env.SORRIR_ES_DEBUG;
    // Needed in order to add context.debug field
    // See: https://github.com/vanthome/winston-elasticsearch/blob/188164eb282b7aa06d7a2e125a5a18dec38e4ab3/transformer.js
    const transformer: Transformer = function (logData) {
      const transformed = {};
      transformed["@timestamp"] = logData.timestamp
        ? logData.timestamp
        : new Date().toISOString();
      transformed["message"] = logData.message;
      transformed["severity"] = logData.level;
      transformed["fields"] = esContextDebug
        ? { ...logData.meta, "metadata.context.debug": esContextDebug }
        : logData.meta;

      if (logData.meta["transaction.id"])
        transformed["transaction"] = { id: logData.meta["transaction.id"] };
      if (logData.meta["trace.id"])
        transformed["trace"] = { id: logData.meta["trace.id"] };
      if (logData.meta["span.id"])
        transformed["span"] = { id: logData.meta["span.id"] };

      return transformed;
    };

    transportMethods = [
      new ElasticsearchTransport({
        client: new Client({
          node: esNodeUrl,
          auth: esAuthConfig,
          context: { testkey: "testvalue" },
        }),
        // Only one of the following properties can be != undefined.
        // index has priority before indexPrefix.
        indexPrefix: esIndex ? undefined : esIndexPrefix,
        index: esIndex,
        level: "debug",
        transformer: transformer,
      }),
    ];
    transportMethods.forEach((tr) =>
      tr.on("warning", (error) => {
        console.error("Warning: ", error);
      })
    );
  } else {
    transportMethods = [new logger.transports.Console({ level: "debug" })];
  }

  const logger_ = logger.createLogger({
    format: logger.format.combine(
      logger.format.timestamp(),
      metadataFormat,
      logger.format.json()
      // logger.format.prettyPrint()
    ),
    transports: transportMethods,
  });
  return logger_;
}

const configUserMap: Map<string, ApplicationContext> = new Map();
const configSystemMap: Map<string, SystemContextStripped> = new Map();
export function configLogger(
  context: SystemContextStripped | ApplicationContext
): void {
  let fileNameFull = "";
  try {
    throw new Error();
  } catch (e) {
    const allMatchesFile = e.stack.match(/[^/]*(\/.*\.[tj]s):[0-9].*/g);
    const callerMatchesFile = allMatchesFile[1].match(
      /[^/]*(\/.*\.[tj]s):[0-9].*$/
    );
    fileNameFull = callerMatchesFile[1];
  }

  if ("area" in context) {
    configSystemMap.set(fileNameFull, context as SystemContext);
  } else {
    configUserMap.set(fileNameFull, context as ApplicationContext);
  }
}

export const log: SorrirLog<Stakeholder.USER | Stakeholder.SYSTEM> = function (
  level: LogLevel,
  message: string,
  data: Record<string, unknown>,
  contextFields: ApplicationContext | SystemContextStripped
): logger.Logger {
  if ("area" in contextFields) {
    return logSystem(level, message, data, contextFields);
  } else {
    return logUser(level, message, data, contextFields);
  }
};

export const logCompact: SorrirLogConfigured<
  Stakeholder.USER | Stakeholder.SYSTEM
> = function (
  level: LogLevel,
  stakeholder: Stakeholder.USER | Stakeholder.SYSTEM,
  message: string,
  data: Record<string, unknown>
): logger.Logger {
  let fileNameFull = "";
  try {
    throw new Error();
  } catch (e) {
    const allMatchesFile = e.stack.match(/[^/]*(\/.*\.[tj]s):[0-9].*/g);
    const callerMatchesFile = allMatchesFile[1].match(
      /[^/]*(\/.*\.[tj]s):[0-9].*$/
    );
    fileNameFull = callerMatchesFile[1];

    if (stakeholder === Stakeholder.SYSTEM) {
      let contextFields = configSystemMap.get(fileNameFull);

      if (!contextFields) {
        contextFields = {
          area: "unknown",
        };
      }

      return logSystem(level, message, data, contextFields);
    } else {
      let contextFields = configUserMap.get(fileNameFull);

      if (!contextFields) {
        contextFields = {
          unit: "unknown",
          component: "unknown",
          degradationMode: "unkown",
        };
      }

      return logUser(level, message, data, contextFields);
    }
  }
};

export const debug: SorrirLogLevel<
  Stakeholder.USER | Stakeholder.SYSTEM
> = function (
  stakeholder: Stakeholder.USER | Stakeholder.SYSTEM,
  message: string,
  data: Record<string, unknown>,
  contextFields?: ApplicationContext | SystemContextStripped
): logger.Logger {
  if (!contextFields) {
    let fileNameFull = "";
    try {
      throw new Error();
    } catch (e) {
      const allMatchesFile = e.stack.match(/[^/]*(\/.*\.[tj]s):[0-9].*/g);
      const callerMatchesFile = allMatchesFile[1].match(
        /[^/]*(\/.*\.[tj]s):[0-9].*$/
      );
      fileNameFull = callerMatchesFile[1];

      if (stakeholder === Stakeholder.SYSTEM) {
        let contextFields = configSystemMap.get(fileNameFull);

        if (!contextFields) {
          contextFields = {
            area: "unknown",
          };
        }

        return logSystem(LogLevel.debug, message, data, contextFields);
      } else {
        let contextFields = configUserMap.get(fileNameFull);

        if (!contextFields) {
          contextFields = {
            unit: "unknown",
            component: "unknown",
            degradationMode: "unkown",
          };
        }

        return logUser(LogLevel.debug, message, data, contextFields);
      }
    }
  }

  if ("area" in contextFields) {
    return logSystem(LogLevel.debug, message, data, contextFields);
  } else {
    return logUser(LogLevel.debug, message, data, contextFields);
  }
};

export const warn: SorrirLogLevel<
  Stakeholder.USER | Stakeholder.SYSTEM
> = function (
  stakeholder: Stakeholder.USER | Stakeholder.SYSTEM,
  message: string,
  data: Record<string, unknown>,
  contextFields?: ApplicationContext | SystemContextStripped
): logger.Logger {
  if (!contextFields) {
    let fileNameFull = "";
    try {
      throw new Error();
    } catch (e) {
      const allMatchesFile = e.stack.match(/[^/]*(\/.*\.[tj]s):[0-9].*/g);
      const callerMatchesFile = allMatchesFile[1].match(
        /[^/]*(\/.*\.[tj]s):[0-9].*$/
      );
      fileNameFull = callerMatchesFile[1];

      if (stakeholder === Stakeholder.SYSTEM) {
        let contextFields = configSystemMap.get(fileNameFull);

        if (!contextFields) {
          contextFields = {
            area: "unknown",
          };
        }

        return logSystem(LogLevel.warn, message, data, contextFields);
      } else {
        let contextFields = configUserMap.get(fileNameFull);

        if (!contextFields) {
          contextFields = {
            unit: "unknown",
            component: "unknown",
            degradationMode: "unkown",
          };
        }

        return logUser(LogLevel.warn, message, data, contextFields);
      }
    }
  }

  if ("area" in contextFields) {
    return logSystem(LogLevel.warn, message, data, contextFields);
  } else {
    return logUser(LogLevel.warn, message, data, contextFields);
  }
};

export const error: SorrirLogLevel<
  Stakeholder.USER | Stakeholder.SYSTEM
> = function (
  stakeholder: Stakeholder.USER | Stakeholder.SYSTEM,
  message: string,
  data: Record<string, unknown>,
  contextFields?: ApplicationContext | SystemContextStripped
): logger.Logger {
  if (!contextFields) {
    let fileNameFull = "";
    try {
      throw new Error();
    } catch (e) {
      const allMatchesFile = e.stack.match(/[^/]*(\/.*\.[tj]s):[0-9].*/g);
      const callerMatchesFile = allMatchesFile[1].match(
        /[^/]*(\/.*\.[tj]s):[0-9].*$/
      );
      fileNameFull = callerMatchesFile[1];

      if (stakeholder === Stakeholder.SYSTEM) {
        let contextFields = configSystemMap.get(fileNameFull);

        if (!contextFields) {
          contextFields = {
            area: "unknown",
          };
        }

        return logSystem(LogLevel.error, message, data, contextFields);
      } else {
        let contextFields = configUserMap.get(fileNameFull);

        if (!contextFields) {
          contextFields = {
            unit: "unknown",
            component: "unknown",
            degradationMode: "unkown",
          };
        }

        return logUser(LogLevel.error, message, data, contextFields);
      }
    }
  }

  if ("area" in contextFields) {
    return logSystem(LogLevel.error, message, data, contextFields);
  } else {
    return logUser(LogLevel.error, message, data, contextFields);
  }
};

export const info: SorrirLogLevel<
  Stakeholder.USER | Stakeholder.SYSTEM
> = function (
  stakeholder: Stakeholder.USER | Stakeholder.SYSTEM,
  message: string,
  data: Record<string, unknown>,
  contextFields?: ApplicationContext | SystemContextStripped
): logger.Logger {
  if (!contextFields) {
    let fileNameFull = "";
    try {
      throw new Error();
    } catch (e) {
      const allMatchesFile = e.stack.match(/[^/]*(\/.*\.[tj]s):[0-9].*/g);
      const callerMatchesFile = allMatchesFile[1].match(
        /[^/]*(\/.*\.[tj]s):[0-9].*$/
      );
      fileNameFull = callerMatchesFile[1];

      if (stakeholder === Stakeholder.SYSTEM) {
        let contextFields = configSystemMap.get(fileNameFull);

        if (!contextFields) {
          contextFields = {
            area: "unknown",
          };
        }

        return logSystem(LogLevel.info, message, data, contextFields);
      } else {
        let contextFields = configUserMap.get(fileNameFull);

        if (!contextFields) {
          contextFields = {
            unit: "unknown",
            component: "unknown",
            degradationMode: "unkown",
          };
        }

        return logUser(LogLevel.info, message, data, contextFields);
      }
    }
  }

  if ("area" in contextFields) {
    return logSystem(LogLevel.info, message, data, contextFields);
  } else {
    return logUser(LogLevel.info, message, data, contextFields);
  }
};

export const logDefault = function (
  level: LogLevel,
  message: string
): logger.Logger {
  return sorrirLogger.log(level.toString(), message);
};

const logSystem: SorrirLog<Stakeholder.SYSTEM> = function (
  level: LogLevel,
  message: string,
  data: Record<string, unknown>,
  contextFieldsStripped: SystemContextStripped
): logger.Logger {
  let fileName = "";
  let funcName = "";
  try {
    throw new Error();
  } catch (e) {
    const allMatchesFile = e.stack.match(/.*\/(.*\.[tj]s):[0-9].*/g);
    const callerMatchesFile = allMatchesFile[2].match(
      /.*\/(.*\.[tj]s):[0-9].*$/
    );
    fileName = callerMatchesFile[1];

    const allMatchesFunc = e.stack.match(/@|at (.+) \(/g);
    const callerMatchesFunc = allMatchesFunc[3].match(/@|at (.+) \(/);
    funcName = callerMatchesFunc[1];
  }

  const context = {
    stakeholder: Stakeholder.SYSTEM,
    contextFields: {
      file: fileName,
      area: contextFieldsStripped ? contextFieldsStripped.area : undefined,
      function: funcName,
    },
  };
  return sorrirLogger.log(level.toString(), message, {
    context: context,
    host: os.hostname(),
    data: data,
  });
};

const logUser: SorrirLog<Stakeholder.USER> = function (
  level: LogLevel,
  message: string,
  data: Record<string, unknown>,
  contextFields: ApplicationContext
): logger.Logger {
  const context = {
    stakeholder: Stakeholder.USER,
    contextFields: contextFields,
  };
  return sorrirLogger.log(level.toString(), message, {
    context: context,
    host: os.hostname(),
    data: data,
  });
};
