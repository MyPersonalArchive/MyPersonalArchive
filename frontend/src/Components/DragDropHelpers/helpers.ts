export const JsonStringifyIfNotString = (input: unknown) => typeof input === "string" ? input : JSON.stringify(input)
