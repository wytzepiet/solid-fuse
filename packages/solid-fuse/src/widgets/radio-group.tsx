export interface RadioGroupProps<T> {
  value: T | undefined;
  onChange?: (value: T) => void;
  children?: JSX.Element;
}

/** Groups the radios inside it: the one whose value matches is selected. */
export function RadioGroup<T extends string | number | boolean>(props: RadioGroupProps<T>) {
  return <radioGroup {...props} />;
}
