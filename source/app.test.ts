import {
  log,
  logCompact,
  LogLevel,
  info,
  warn,
  debug,
  error,
  Stakeholder,
} from "./app";
//import { ApplicationContext, SystemContext, LogEntry, getLogger, Stakeholder, context } from "./app";
import * as App from "./app";
import * as os from "os";

// These tests can be used to test both output to the console and
// to Elasticsearch. Testing the latter can be achieved by setting
// the appropriate environment variables (documented in README.md),
// running the test-suite and manually observing whether the logs
// correctly reach the specified Elasticsearch instance.

describe("some tests", () => {
  const sysContext: App.SystemContext = {
    file: "app.test.ts",
    function: "Object.asyncJestTest",
    area: "execution",
  };
  const appContext: App.ApplicationContext = {
    unit: "pod1",
    component: "DSB",
    degradationMode: "Manual",
  };

  const host1 = "production-pi1";
  const dataApp = { degradationReason: "DSB not reachable" };
  const dataSys = { communication: "REST" };

  test("Test with log entry, app", () => {
    const logger_ = App.getLogger();
    const logEntryApp: App.LogEntry<App.Stakeholder.USER> = {
      context: { stakeholder: App.Stakeholder.USER, contextFields: appContext },
      host: host1,
      data: dataApp,
      stakeholder: App.Stakeholder.USER,
      contextFields: appContext,
    };

    const cb = function (logEntryRecUser) {
      expect(logEntryRecUser.metadata.context).toMatchObject<
        App.context<App.Stakeholder.USER>
      >(logEntryApp.context);
      //expect(logEntryApp.contextFields).toBe(logEntryRecUser.contextFields);
      expect(logEntryRecUser.metadata.data).toMatchObject(logEntryApp.data);
      expect(logEntryRecUser.metadata.host).toBe(logEntryApp.host);
    };

    App.sorrirLogger.addListener("data", cb);

    logger_.log("info", "Do we really need the data field?", {
      context: logEntryApp.context,
      host: logEntryApp.host,
      data: logEntryApp.data,
    });

    App.sorrirLogger.removeListener("data", cb);
  });
  test("Test with log entry, system", () => {
    const logger_ = App.getLogger();
    const logEntrySys: App.LogEntry<App.Stakeholder.SYSTEM> = {
      context: {
        stakeholder: App.Stakeholder.SYSTEM,
        contextFields: sysContext,
      },
      host: host1,
      data: dataSys,
      stakeholder: App.Stakeholder.SYSTEM,
      contextFields: sysContext,
    };

    const cb = function (logEntryRecSys) {
      expect(logEntryRecSys.metadata.context).toMatchObject<
        App.context<App.Stakeholder.SYSTEM>
      >(logEntrySys.context);
      //expect(logEntrySys.contextFields).toBe(logEntryRecSys.contextFields);
      expect(logEntryRecSys.metadata.data).toMatchObject(logEntrySys.data);
      expect(logEntryRecSys.metadata.host).toBe(logEntrySys.host);
    };

    App.sorrirLogger.addListener("data", cb);

    logger_.log("info", "Do we really need the data field?", {
      context: logEntrySys.context,
      host: logEntrySys.host,
      data: logEntrySys.data,
    });

    App.sorrirLogger.removeListener("data", cb);
  });
  test("Test using inline style, app", () => {
    const logger_ = App.getLogger();
    const logEntryApp: App.LogEntry<App.Stakeholder.USER> = {
      context: { stakeholder: App.Stakeholder.USER, contextFields: appContext },
      host: host1,
      data: dataApp,
      stakeholder: App.Stakeholder.USER,
      contextFields: appContext,
    };

    const cb = function (logEntryRecUser) {
      expect(logEntryRecUser.metadata.context).toMatchObject<
        App.context<App.Stakeholder.USER>
      >(logEntryApp.context);
      //expect(logEntryApp.contextFields).toBe(logEntryRecUser.contextFields);
      expect(logEntryRecUser.metadata.data).toMatchObject(logEntryApp.data);
      expect(logEntryRecUser.metadata.host).toBe(logEntryApp.host);
    };

    App.sorrirLogger.addListener("data", cb);

    logger_.log("info", "Do we really need the data field?", {
      context: {
        stakeholder: App.Stakeholder.USER,
        contextFields: {
          unit: appContext.unit,
          component: appContext.component,
          degradationMode: appContext.degradationMode,
        },
      },
      host: host1,
      data: dataApp,
    });

    App.sorrirLogger.removeListener("data", cb);
  });
  test("Test using inline style, sys", () => {
    const logger_ = App.getLogger();
    const logEntrySys: App.LogEntry<App.Stakeholder.SYSTEM> = {
      context: {
        stakeholder: App.Stakeholder.SYSTEM,
        contextFields: sysContext,
      },
      host: host1,
      data: dataSys,
      stakeholder: App.Stakeholder.SYSTEM,
      contextFields: sysContext,
    };

    const cb = function (logEntryRecSys) {
      expect(logEntryRecSys.metadata.context).toMatchObject<
        App.context<App.Stakeholder.SYSTEM>
      >(logEntrySys.context);
      //expect(logEntrySys.contextFields).toBe(logEntryRecSys.contextFields);
      expect(logEntryRecSys.metadata.data).toMatchObject(logEntrySys.data);
      expect(logEntryRecSys.metadata.host).toBe(logEntrySys.host);
    };

    App.sorrirLogger.addListener("data", cb);

    logger_.log("info", "Do we really need the data field?", {
      context: {
        stakeholder: App.Stakeholder.SYSTEM,
        contextFields: {
          file: sysContext.file,
          function: sysContext.function,
          area: sysContext.area,
        },
      },
      host: host1,
      data: dataSys,
    });

    App.sorrirLogger.removeListener("data", cb);
  });
  test("Test sorrir logger, default", () => {
    const cb = function (logEntryRecDefault) {
      expect("Do we really need the data field?").toBe(
        logEntryRecDefault.message
      );
    };

    App.sorrirLogger.addListener("data", cb);

    App.logDefault(LogLevel.info, "Do we really need the data field?");
    // needed for new callback on event setting in next test
    App.sorrirLogger.removeListener("data", cb);
  });
  test("Test sorrir logger, app extended", () => {
    const logEntryApp: App.LogEntry<App.Stakeholder.USER> = {
      context: { stakeholder: App.Stakeholder.USER, contextFields: appContext },
      host: os.hostname(),
      data: dataApp,
      stakeholder: App.Stakeholder.USER,
      contextFields: appContext,
    };

    const cb = function (logEntryRecUser) {
      expect(logEntryRecUser.metadata.context).toMatchObject<
        App.context<App.Stakeholder.USER>
      >(logEntryApp.context);
      //expect(logEntryApp.contextFields).toBe(logEntryRecUser.contextFields);
      expect(logEntryRecUser.metadata.data).toMatchObject(logEntryApp.data);
      expect(logEntryRecUser.metadata.host).toBe(logEntryApp.host);
    };

    App.sorrirLogger.addListener("data", cb);

    log(LogLevel.info, "Do we really need the data field?", dataApp, {
      unit: appContext.unit,
      component: appContext.component,
      degradationMode: appContext.degradationMode,
    });
    // needed for new callback on event setting in next test
    App.sorrirLogger.removeListener("data", cb);
  });
  test("Test sorrir logger, app compact", () => {
    const logEntryApp: App.LogEntry<App.Stakeholder.USER> = {
      context: { stakeholder: App.Stakeholder.USER, contextFields: appContext },
      host: os.hostname(),
      data: dataApp,
      stakeholder: App.Stakeholder.USER,
      contextFields: appContext,
    };

    App.configLogger(logEntryApp.contextFields);

    const cb = function (logEntryRecUser) {
      expect(logEntryRecUser.metadata.context).toMatchObject<
        App.context<App.Stakeholder.USER>
      >(logEntryApp.context);
      //expect(logEntryApp.contextFields).toBe(logEntryRecUser.contextFields);
      expect(logEntryRecUser.metadata.data).toMatchObject(logEntryApp.data);
      expect(logEntryRecUser.metadata.host).toBe(logEntryApp.host);
    };

    App.sorrirLogger.addListener("data", cb);

    logCompact(
      LogLevel.info,
      Stakeholder.USER,
      "Do we really need the data field?",
      dataApp
    );
    // needed for new callback on event setting in next test
    App.sorrirLogger.removeListener("data", cb);
  });
  test("Test sorrir logger, system extended", () => {
    const logger_ = App.getLogger();
    const logEntrySys: App.LogEntry<App.Stakeholder.SYSTEM> = {
      context: {
        stakeholder: App.Stakeholder.SYSTEM,
        contextFields: sysContext,
      },
      host: os.hostname(),
      data: dataSys,
      stakeholder: App.Stakeholder.SYSTEM,
      contextFields: sysContext,
    };

    const cb = function (logEntryRecSys) {
      expect(logEntryRecSys.metadata.context).toMatchObject<
        App.context<App.Stakeholder.SYSTEM>
      >(logEntrySys.context);
      //expect(logEntrySys.contextFields).toBe(logEntryRecSys.contextFields);
      expect(logEntryRecSys.metadata.data).toMatchObject(logEntrySys.data);
      expect(logEntryRecSys.metadata.host).toBe(logEntrySys.host);
    };

    App.sorrirLogger.addListener("data", cb);

    //App.sorrirLogger.on("data", cb);

    log(LogLevel.info, "Do we really need the data field?", dataSys, {
      area: sysContext.area,
    });
    // needed for new callback on event setting in next test
    App.sorrirLogger.removeListener("data", cb);
  });
  test("Test sorrir logger, system compact", () => {
    const logger_ = App.getLogger();
    const logEntrySys: App.LogEntry<App.Stakeholder.SYSTEM> = {
      context: {
        stakeholder: App.Stakeholder.SYSTEM,
        contextFields: sysContext,
      },
      host: os.hostname(),
      data: dataSys,
      stakeholder: App.Stakeholder.SYSTEM,
      contextFields: sysContext,
    };

    const cb = function (logEntryRecSys) {
      expect(logEntryRecSys.metadata.context).toMatchObject<
        App.context<App.Stakeholder.SYSTEM>
      >(logEntrySys.context);
      //expect(logEntrySys.contextFields).toBe(logEntryRecSys.contextFields);
      expect(logEntryRecSys.metadata.data).toMatchObject(logEntrySys.data);
      expect(logEntryRecSys.metadata.host).toBe(logEntrySys.host);
    };

    App.sorrirLogger.addListener("data", cb);
    //App.sorrirLogger.on("data", cb);

    App.configLogger(logEntrySys.contextFields);

    logCompact(
      LogLevel.info,
      Stakeholder.SYSTEM,
      "Do we really need the data field?",
      dataSys
    );
    // needed for new callback on event setting in next test
    App.sorrirLogger.removeListener("data", cb);
  });
  test("Test sorrir logger, app warn extended", () => {
    const logEntryApp: App.LogEntry<App.Stakeholder.USER> = {
      context: { stakeholder: App.Stakeholder.USER, contextFields: appContext },
      host: os.hostname(),
      data: dataApp,
      stakeholder: App.Stakeholder.USER,
      contextFields: appContext,
    };

    const cb = function (logEntryRecUser) {
      expect(logEntryRecUser.metadata.context).toMatchObject<
        App.context<App.Stakeholder.USER>
      >(logEntryApp.context);
      //expect(logEntryApp.contextFields).toBe(logEntryRecUser.contextFields);
      expect(logEntryRecUser.metadata.data).toMatchObject(logEntryApp.data);
      expect(logEntryRecUser.metadata.host).toBe(logEntryApp.host);
    };

    App.sorrirLogger.addListener("data", cb);

    debug(Stakeholder.USER, "Do we really need the data field?", dataApp, {
      unit: appContext.unit,
      component: appContext.component,
      degradationMode: appContext.degradationMode,
    });
    // needed for new callback on event setting in next test
    App.sorrirLogger.removeListener("data", cb);
  });
  test("Test sorrir logger, app warn compact", () => {
    const logEntryApp: App.LogEntry<App.Stakeholder.USER> = {
      context: { stakeholder: App.Stakeholder.USER, contextFields: appContext },
      host: os.hostname(),
      data: dataApp,
      stakeholder: App.Stakeholder.USER,
      contextFields: appContext,
    };

    App.configLogger(logEntryApp.contextFields);

    const cb = function (logEntryRecUser) {
      expect(logEntryRecUser.metadata.context).toMatchObject<
        App.context<App.Stakeholder.USER>
      >(logEntryApp.context);
      //expect(logEntryApp.contextFields).toBe(logEntryRecUser.contextFields);
      expect(logEntryRecUser.metadata.data).toMatchObject(logEntryApp.data);
      expect(logEntryRecUser.metadata.host).toBe(logEntryApp.host);
    };

    App.sorrirLogger.addListener("data", cb);

    debug(Stakeholder.USER, "Do we really need the data field?", dataApp);
    // needed for new callback on event setting in next test
    App.sorrirLogger.removeListener("data", cb);
  });
  test("Test sorrir logger, system warn extended", () => {
    const logger_ = App.getLogger();
    const logEntrySys: App.LogEntry<App.Stakeholder.SYSTEM> = {
      context: {
        stakeholder: App.Stakeholder.SYSTEM,
        contextFields: sysContext,
      },
      host: os.hostname(),
      data: dataSys,
      stakeholder: App.Stakeholder.SYSTEM,
      contextFields: sysContext,
    };

    const cb = function (logEntryRecSys) {
      expect(logEntryRecSys.metadata.context).toMatchObject<
        App.context<App.Stakeholder.SYSTEM>
      >(logEntrySys.context);
      //expect(logEntrySys.contextFields).toBe(logEntryRecSys.contextFields);
      expect(logEntryRecSys.metadata.data).toMatchObject(logEntrySys.data);
      expect(logEntryRecSys.metadata.host).toBe(logEntrySys.host);
    };

    App.sorrirLogger.addListener("data", cb);

    //App.sorrirLogger.on("data", cb);

    debug(Stakeholder.SYSTEM, "Do we really need the data field?", dataSys, {
      area: sysContext.area,
    });
    // needed for new callback on event setting in next test
    App.sorrirLogger.removeListener("data", cb);
  });
  test("Test sorrir logger, system compact", () => {
    const logger_ = App.getLogger();
    const logEntrySys: App.LogEntry<App.Stakeholder.SYSTEM> = {
      context: {
        stakeholder: App.Stakeholder.SYSTEM,
        contextFields: sysContext,
      },
      host: os.hostname(),
      data: dataSys,
      stakeholder: App.Stakeholder.SYSTEM,
      contextFields: sysContext,
    };

    const cb = function (logEntryRecSys) {
      expect(logEntryRecSys.metadata.context).toMatchObject<
        App.context<App.Stakeholder.SYSTEM>
      >(logEntrySys.context);
      //expect(logEntrySys.contextFields).toBe(logEntryRecSys.contextFields);
      expect(logEntryRecSys.metadata.data).toMatchObject(logEntrySys.data);
      expect(logEntryRecSys.metadata.host).toBe(logEntrySys.host);
    };

    App.sorrirLogger.addListener("data", cb);
    //App.sorrirLogger.on("data", cb);

    App.configLogger(logEntrySys.contextFields);

    debug(Stakeholder.SYSTEM, "Do we really need the data field?", dataSys);
  });
});
