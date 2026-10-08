import {
  type ToolDefinition,
  type ToolDataSource,
  type ToolUI,
  type ToolUIField,
  type ToolUIOption,
} from "./registry";

function getNestedValue(
  object: unknown,
  path: string,
): unknown {
  if (
    !object ||
    typeof object !== "object"
  ) {
    return undefined;
  }

  return path.split(".").reduce<unknown>(
    (current, key) => {
      if (
        !current ||
        typeof current !== "object"
      ) {
        return undefined;
      }

      return (
        current as Record<string, unknown>
      )[key];
    },
    object,
  );
}

function extractItems(
  data: unknown,
): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (
    data &&
    typeof data === "object"
  ) {
    const object =
      data as Record<string, unknown>;

    if (Array.isArray(object.items)) {
      return object.items;
    }

    for (const value of Object.values(object)) {
      if (Array.isArray(value)) {
        return value;
      }
    }
  }

  return [];
}

function buildOptions(
  data: unknown,
  dataSource: ToolDataSource,
): ToolUIOption[] {
  const options: ToolUIOption[] = [];

  for (const item of extractItems(data)) {
    const label = getNestedValue(
      item,
      dataSource.labelField,
    );
    const value = getNestedValue(
      item,
      dataSource.valueField,
    );

    if (
      label === undefined ||
      label === null ||
      value === undefined ||
      value === null
    ) {
      continue;
    }

    options.push({
      label: String(label),
      value: String(value),
    });
  }

  return options;
}

async function loadDataSource(
  dataSource: ToolDataSource,
  request: Request,
): Promise<ToolUIOption[]> {
  const auth =
    request.headers.get(
      "authorization",
    );

  if (!auth) {
    throw new Error(
      "Authorization is required",
    );
  }

  if (
    !/^\/api\/[a-zA-Z0-9/_-]+$/.test(
      dataSource.path,
    )
  ) {
    throw new Error(
      `Invalid data source path: ${dataSource.path}`,
    );
  }

  const url =
    new URL(
      dataSource.path,
      request.url,
    );

  const method =
    dataSource.method ??
    "GET";

  const response =
    await fetch(
      url,
      {
        method,
        headers: {
          Authorization: auth,
          "Content-Type":
            "application/json",
        },
      },
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `Data source failed: ${response.status} ${text}`,
    );
  }

  const contentType =
    response.headers.get(
      "content-type",
    ) ?? "";

  const data =
    contentType.includes(
      "application/json",
    )
      ? await response.json()
      : [];

  return buildOptions(
    data,
    dataSource,
  );
}

function dataSourceKey(
  dataSource: ToolDataSource,
): string {
  return `${dataSource.method ?? "GET"}:${dataSource.path}:${dataSource.labelField}:${dataSource.valueField}`;
}

export async function buildToolUI(
  definition: ToolDefinition,
  request: Request,
): Promise<ToolUI | null> {
  if (!definition.ui) {
    return null;
  }

  if (
    definition.ui.type !== "form"
  ) {
    throw new Error(
      `Unsupported UI type: ${definition.ui.type}`,
    );
  }

  const dataSourceCache =
    new Map<
      string,
      Promise<ToolUIOption[]>
    >();

  const fields =
    await Promise.all(
      (definition.ui.fields ?? []).map(
        async (
          field,
        ): Promise<ToolUIField> => {
          const uiField: ToolUIField = {
            name:
              field.name,
            label:
              field.label,
            type:
              field.type,
            required:
              field.required,
            placeholder:
              field.placeholder,
          };

          if (
            field.type !==
            "select"
          ) {
            return uiField;
          }

          if (
            field.dataSource
          ) {
            const key =
              dataSourceKey(
                field.dataSource,
              );

            let options =
              dataSourceCache.get(
                key,
              );

            if (!options) {
              options =
                loadDataSource(
                  field.dataSource,
                  request,
                );

              dataSourceCache.set(
                key,
                options,
              );
            }

            uiField.options =
              await options;
          } else {
            uiField.options =
              field.options ?? [];
          }

          return uiField;
        },
      ),
    );

  return {
    type:
      "form",
    title:
      definition.ui.title,
    submitLabel:
      definition.ui.submitLabel,
    fields,
  };
}
