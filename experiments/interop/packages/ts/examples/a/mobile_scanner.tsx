// README: MobileScanner(onDetect: (result) { print(result.barcodes.first.rawValue); })
import { MobileScanner } from "~/_generated/mobile_scanner";

export const Scanner = (props: { onCode: (code: string) => void }) => (
  <MobileScanner
    onDetect={(result) => {
      const v = result.barcodes[0]?.rawValue;
      if (v != null) props.onCode(v);
    }}
  />
);
