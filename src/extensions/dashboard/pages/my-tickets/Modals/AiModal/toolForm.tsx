import {
    Box,
    Button,
    Input,
    SelectorList,
    Text,
} from '@wix/design-system';
import { useState } from 'react';

export interface ToolUIOption {
    label: string;
    value: string;
}

export interface ToolUIField {
    name: string;
    label: string;
    type: 'text' | 'select';
    required?: boolean;
    placeholder?: string;
    options?: ToolUIOption[];
}

export interface ToolUI {
    type: 'form';
    title: string;
    submitLabel: string;
    fields: ToolUIField[];
}

interface ToolFormProps {
    ui: ToolUI;
    onSubmit: (
        values: Record<string, string>,
    ) => void | Promise<void>;
    loading?: boolean;
}

export const ToolForm = ({
    ui,
    onSubmit,
    loading = false,
}: ToolFormProps) => {
    const [values, setValues] =
        useState<Record<string, string>>({});

    const [error, setError] =
        useState<string | null>(null);

    const updateValue = (
        name: string,
        value: string,
    ) => {
        setValues((previous) => ({
            ...previous,
            [name]: value,
        }));

        setError(null);
    };

    const handleSubmit = async () => {
        // --------------------------------------------------
        // Validate required fields
        // --------------------------------------------------

        for (const field of ui.fields) {
            if (
                field.required &&
                !values[field.name]?.trim()
            ) {
                setError(
                    `${field.label} is required.`,
                );

                return;
            }
        }

        setError(null);

        // --------------------------------------------------
        // Submit form values
        // --------------------------------------------------

        await onSubmit(values);
    };

    return (
        <Box
            direction="vertical"
            gap="12px"
            width="100%"
        >
            <Text weight="bold">
                {ui.title}
            </Text>

            {ui.fields.map((field) => {
                const value =
                    values[field.name] ?? '';

                return (
                    <Box
                        key={field.name}
                        direction="vertical"
                        gap="2px"
                        width="100%"
                    >
                        <Text size="small">
                            {field.label}

                            {field.required
                                ? ' *'
                                : ''}
                        </Text>

                        {/* ---------------------------------- */}
                        {/* Text field                         */}
                        {/* ---------------------------------- */}

                        {field.type ===
                            'text' && (
                            <Input
                                size="medium"
                                value={value}
                                placeholder={
                                    field.placeholder
                                }
                                onChange={(
                                    event,
                                ) =>
                                    updateValue(
                                        field.name,
                                        event.target
                                            .value,
                                    )
                                }
                                disabled={
                                    loading
                                }
                            />
                        )}

                        {/* ---------------------------------- */}
                        {/* SelectorList field                 */}
                        {/* ---------------------------------- */}

                        {field.type ===
                            'select' && (
                            <SelectorList
                                dataHook="selector-list-ai"
                                withSearch={false}
                                size="small"
                                dataSource={async (
                                    searchQuery,
                                    offset,
                                    limit,
                                ) => {
                                    const options =
                                        field.options ??
                                        [];

                                    const filtered =
                                        options.filter(
                                            (
                                                option,
                                            ) =>
                                                option.label
                                                    .toLowerCase()
                                                    .includes(
                                                        searchQuery.toLowerCase(),
                                                    ),
                                        );

                                    const items =
                                        filtered
                                            .slice(
                                                offset,
                                                offset +
                                                    limit,
                                            )
                                            .map(
                                                (
                                                    option,
                                                ) => ({
                                                    id: option.value,
                                                    title: option.label,
                                                    selected:
                                                        value ===
                                                        option.value,
                                                }),
                                            );

                                    return {
                                        items,
                                        totalCount:
                                            filtered.length,
                                    };
                                }}
                                onSelect={(
                                    item,
                                ) => {
                                    updateValue(
                                        field.name,
                                        String(
                                            item.id,
                                        ),
                                    );
                                }}
                            />
                        )}
                    </Box>
                );
            })}

            {/* ---------------------------------------------- */}
            {/* Validation error                              */}
            {/* ---------------------------------------------- */}

            {error && (
                <Text size="small">
                    {error}
                </Text>
            )}

            {/* ---------------------------------------------- */}
            {/* Submit                                         */}
            {/* ---------------------------------------------- */}

            <Button
                size="medium"
                skin="ai"
                onClick={handleSubmit}
                disabled={loading}
            >
                {loading
                    ? 'Working...'
                    : ui.submitLabel}
            </Button>
        </Box>
    );
};