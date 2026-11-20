// README: const spinkit = SpinKitRotatingCircle(color: Colors.white, size: 50.0);
//         SpinKitFadingCircle(itemBuilder: (context, index) => DecoratedBox(...))   <- itemBuilder is NOT bridged
import { SpinKitFadingCircle, SpinKitRotatingCircle } from "~/_generated/flutter_spinkit";

export const Spinner = () => <SpinKitRotatingCircle color="Colors.white" size={50} />;
export const Fading = () => <SpinKitFadingCircle color="#3366ff" size={50} duration={1200} />;
// @ts-expect-error itemBuilder (per-dot builder) is omitted: builder/encodable args
export const NotBridged = () => <SpinKitFadingCircle itemBuilder={() => null} />;
