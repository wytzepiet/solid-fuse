import type { BaseProps, FlexInput } from "../types";

export interface MaterialPageProps extends BaseProps {
  fullscreenDialog?: boolean;
  maintainState?: boolean;
  flex?: FlexInput;
}

export function MaterialPage(props: MaterialPageProps) {
  return <materialPage {...props} />;
}
