/** Attempt every independent persistence phase, but never report success on failure. */
export async function flushIndependent(
  actions: ReadonlyArray<() => Promise<unknown>>,
): Promise<void> {
  const failures: unknown[] = [];
  for (const action of actions) {
    try {
      await action();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length)
    throw new AggregateError(failures, 'One or more persistence operations failed');
}
