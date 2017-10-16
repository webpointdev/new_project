// @flow

import { DecodeError } from './asserts';
import * as Result from './Result';
import type { Decoder, Verifier } from './types';

const DECODER_MARK = Symbol('DECODER_MARK');

/**
 * Will verify that the passed-in arbitrary object indeed is an Array,
 * and return it.  Otherwise throws a runtime error.
 */
export function asArray(blobs: any): Array<any> {
    if (!Array.isArray(blobs)) {
        throw DecodeError('Not an array', 'Expected an array', blobs);
    }

    return (blobs: Array<any>);
}

/**
 * Will verify that the passed-in arbitrary object indeed is an Object,
 * and return it.  Otherwise throws a runtime error.
 */
export function asObject(blob: any): Object {
    if (typeof blob !== 'object') {
        throw DecodeError('Not an object', 'Expected an object', blob);
    }

    return (blob: Object);
}

export function isDecoderError(error: Error): boolean {
    // $FlowFixMe
    return !!error[DECODER_MARK];
}

export function toDecoder<T>(verifier: Verifier<T>): Decoder<T> {
    return (blob: any) => {
        const result = verifier(blob);
        return Result.dispatch(
            result,
            error => {
                const e = new Error(error);
                // $FlowFixMe
                e[DECODER_MARK] = true;
                // $FlowFixMe
                e.blob = blob;
                throw e;
            },
            data => data
        );
    };
}

export function toVerifier<T>(decoder: Decoder<T>): Verifier<T> {
    return (blob: any) => {
        try {
            const result: T = decoder(blob);
            return Result.ok(result);
        } catch (err) {
            if (isDecoderError(err)) {
                return Result.err(err.message);
            }

            // Re-throw it, it's something else
            throw err;
        }
    };
}
