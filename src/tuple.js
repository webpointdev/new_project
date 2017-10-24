// @flow

import { makeErr } from './asserts';
import { Ok } from 'lemons';
import type { Verifier } from './types';

/**
 * Builds a Verifier that returns Ok for 2-tuples of `[T, V]`, given Verifiers
 * for `T` and `V`.  Err otherwise.
 */
export function tuple2<T, V>(verifier1: Verifier<T>, verifier2: Verifier<V>): Verifier<[T, V]> {
    return (blobs: any) => {
        if (!Array.isArray(blobs)) {
            return makeErr('Must be an array');
        }

        if (blobs.length !== 2) {
            return makeErr(
                'Must be a 2-tuple',
                `Expected a 2-tuple, but got an array of ${blobs.length} elements`,
                blobs
            );
        }

        const [blob1, blob2] = blobs;

        const t1 = verifier1(blob1);
        const t2 = verifier2(blob2);

        return t1.dispatch(
            (value1: T) =>
                t2.dispatch(
                    (value2: V) => Ok([value1, value2]),
                    e => makeErr('Unexpected value in 2nd tuple position', blob2, [e])
                ),
            e => makeErr('Unexpected value in 1st tuple position', blob1, [e])
        );
    };
}
