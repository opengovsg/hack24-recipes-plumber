import { type BackoffStrategy, type Job } from 'bullmq'

export const INITIAL_DELAY_MS = 3000

export const exponentialBackoffWithJitter: BackoffStrategy = function (
  attemptsMade: number,
  _type: string,
  _err: Error,
  _job: Job,
): number {
  // This implements FullJitter-like jitter, with the following changes:
  //
  // * We wait _at least_ the full duration of the previous delay (or on the 1st
  //   retry, at least the full initial delay).
  // * No cap on wait time; capping should not matter here since we cap total
  //   attempts.
  //
  // Reference:
  // https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/

  const prevFullDelay = Math.pow(2, attemptsMade - 1) * INITIAL_DELAY_MS
  return prevFullDelay + Math.round(Math.random() * prevFullDelay)
}