// @flow

import moment from 'moment';

import { DecodeError } from './asserts';
import { decodeNumber } from './number';
import type { Decoder } from './types';
import { map } from './utils';

const date_re = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const datetime_with_tzinfo_re = /^[0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9]{2}:[0-9]{2}:[0-9]{2}(?:[.][0-9]+)?(?:Z|[+-][0-9]{2}:?[0-9]{2})$/;
const datetime_without_tzinfo_re = /^[0-9]{4}-[0-9]{2}-[0-9]{2}(?:[ T][0-9]{2}:[0-9]{2}:[0-9]{2}(?:[.][0-9]+)?)?$/;

// The year this JS module got loaded :P
const THIS_YEAR = moment().year();

function validateMoment(moment: moment$Moment): moment$Moment {
    // This is a noop in production, for perf reasons
    if (process.env.NODE_ENV === 'production') {
        return moment;
    }

    // We'll allow the exceptional case of using 1970-1-1 in practice, since this date is often
    // symbolically used to indicate "not started" or something similar
    if (moment.valueOf() === 0) {
        return moment;
    }

    // Otherwise, in local dev mode, make sure to support data that's older than 1971 and younger than
    // 50-years-from-now, which should be sufficient for all practical tests I hope.  Any date outside
    // of this range is likely caused by some variant of the x1000 representation in JS.
    const year = moment.year();
    if (year < 1971 || year > THIS_YEAR + 50) {
        throw new Error(
            `This moment represents a date that's likely too far off from today to be correct: ${moment.format()}. Did you perhaps forget to multiply a Unix timestamp by 1000 to make it a Javascript timestamp?`
        );
    }
    return moment;
}

/**
 * Decodes a date format by returning a Moment instance.
 *
 * Value inputs are:
 * - A number, which will be interpreted as Moment in UTC time
 * - A ISO8601 string without timezone info, which will be parsed and interpreted as
 *   a Moment in UTC time
 * - A ISO8601 string with timezone info, which will be parsed and interpreted as a
 *   Moment in the specified timezone offset
 *
 */
export function decodeMoment(): Decoder<moment$Moment> {
    const numberDecoder = decodeNumber();
    return (blob: any) => {
        if (typeof blob === 'number') {
            const timestamp = numberDecoder(blob);
            return validateMoment(moment.utc(timestamp));
        } else if (typeof blob === 'string') {
            const s = (blob: string);
            if (datetime_with_tzinfo_re.test(s)) {
                return validateMoment(moment.parseZone(s)); // assume an ISO-formatted date string
            } else if (datetime_without_tzinfo_re.test(s)) {
                return validateMoment(moment.utc(s)); // if this is just a date (without a time or timezone), interpret it as a UTC date
            } else {
                throw DecodeError(
                    'Not a valid date',
                    `I did not recognize the date string format: "${s}".  The date should be in ISO8601 format.`,
                    blob
                );
            }
        } else {
            throw DecodeError('Not a valid date', 'I did expect either a number or a string', blob);
        }
    };
}

/**
 * Decodes a Unix timestamp value (an integer) from a date specification.  Accepts and interprets
 * the same inputs as decodeMoment(), but the returned type will not be moments, but timestamps.
 */
export function decodeTimestamp(): Decoder<number> {
    return map(decodeMoment(), m => m.valueOf());
}

/**
 * Decodes a date by returning a local Moment instance representing the start of that
 * date in the viewer local's timezone.  Do not use this to decode an absolute moment
 * in time.  Use it for parsing out stuff like "May 2nd" (independent of the exact
 * moment).
 */
export function decodeDate(): Decoder<moment$Moment> {
    return (blob: any) => {
        if (typeof blob === 'string') {
            const s = (blob: string);
            if (date_re.test(s)) {
                return moment(s);
            } else {
                throw DecodeError(
                    'Not a valid date',
                    'I did not recognize the date string format: "${s}".  The date should be in YYYY-MM-DD format.',
                    blob
                );
            }
        } else {
            throw DecodeError('Not a valid date', 'I did expect a string', blob);
        }
    };
}