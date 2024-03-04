import { AuthTokens } from "./auth.types"

export interface Output<T> {
    data: T,
    tokens?: AuthTokens
}

export interface AuthInput<T> {
    userId: string,
    data: T,
    files?: Array<Express.Multer.File>
}

export interface Input<T> {
    data: T,
    files?: Array<Express.Multer.File>
}

export interface AuthEmptyDataInput {
    userId: string,
    files?: Array<Express.Multer.File>
}

export interface ParamsWithOptions<T, K> {
    params: T,
    options?: Partial<K>
}

export interface ResultsWithMetadata<T, K> {
    results: Array<T>,
    metadata?: Partial<K>
}

