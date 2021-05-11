# sorrir-logging

Logging tailormade for sorrir: This logger was created to specifically fulfill the log requirememnts of the Sorrir project.
In particular, this means that specific information like the context (system or user), the degradation reason or the unit
where the log is generated can be specified. In addition, there is the possibility to give generic information  in form of a message field and a structured data record in the data field.

The sorrir-logger is based on the winston logger for js-based projects.

## Usage

Relevant fields for a log-message are the following:

```
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
```

For the `log-levels`, following values can be chosen:

```
export enum LogLevel {
  info = "info",
  debug = "debug",
  warn = "warn",
  error = "error",
}
```

The `message` field is an arbitrary string that can be chosen by the developer to encode situation-specific information.

The `data` field can be used to encode
structured information like:

```
deployedConfiguration: {
  components: deployedConfiguration.components,
  connections: deployedConfiguration.connections,
}
```

Based on the value of the generic `S` (can be either `Stakeholder.SYSTEM` or `Stakeholder.USER`), the value of `contextFields`
can be either

```
export type SystemContext = SystemContextStripped & {
  function: string;
  file: string;
};
```

where

```
export type SystemContextStripped = {
  area: "execution" | "operation" | "orchestration" | "resilience" | "unknown";
};
```

or

```
export type ApplicationContext = {
  unit: string;
  component: string;
  degradationMode: string;
```

In case of `Stakeholder.SYSTEM`, the functional area in which the logging takes place can
be chosen (e.g. `resilience`). The fields
`function` and `file` are set automatically by the logger based on the
source-file, where this log message is executed. 
`unit`, `component` and `degradationMode` must be set accordingly by the developer.
`unit` refers to the software-unit wherein the respective sorrir-`component` is executed
and `degradationMode` defines the mode of degradation into which the component has apparently
descended.

Similar to the winston syntax, instead of giving the log-level as an argument, instead
the level can be given as the function-name (instead of `log`). Furthermore, if
inside a single source file, certain log fields might always be the same, so the logger
can be configured per source-file like so:

```
sorrirLogger.configLogger({ area: "execution" });
```

Summarized, a possible log-message could look like the following:

```
    sorrirLogger.info(
      Stakeholder.USER,
      "",
      { connections: connsForComp, toExecute: runConfig.toExecute },
      {
        unit: runConfig.toExecute,
        component: component.name,
        degradationMode: "operational",
      }
    );
```

As a matter of fact, the differentiation between the context `SYSTEM` and `USER` should be taken
based upon either the development of a sorrir-application (i.e. developing and wiring of components and incorporation
of resilience patterns) or development of the framework (e.g. modifying or extending the execution-engine).

## Specifying the logging target

A HowTo log to ES can be found [here](howto_es.md).

If `NODE_ENV` is equal to `'production'`, we log to stdout.
Otherwise, we check whether the environment variables `SORRIR_ES_URL`, `SORRIR_ES_USER` and `SORRIR_ES_PASSWORD` are set.
If one is not, we log to stdout.
Otherwise we log to the Elasticsearch instance specified via these environment variables.

The target index that is logged to can be configured via environment variables as well.
The variable `SORRIR_ES_INDEX` can be used to log to a specific index.
The variable `SORRIR_ES_INDEX_PREFIX` can be used to log to a date-dependent index (e.g. setting `SORRIR_ES_INDEX_PREFIX` to "hello" will make the logger log to the index `hello-$timestamp_day`).
If both are specified, `SORRIR_ES_INDEX_PREFIX` is disregarded.
If none are specified, the logger behaves as if `SORRIR_ES_INDEX_PREFIX` was set to "filebeat-debug".

For easy organisation, there is a possibility to add an additional key-value pair to logs when outputting to Elasticsearch. 
Setting the environment variable `SORRIR_ES_DEBUG` to `your_value` will cause the logs to possess the key-value pair `fields.metadata.context.debug = your_value`.