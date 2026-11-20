// README: QrImageView(data: '1234567890', version: QrVersions.auto, size: 200.0)
import { QrImageView } from "~/_generated/qr_flutter";

// QrVersions.auto is a static const on a holder class; it is not surfaced, so it is the literal -1 (also the default).
export const Qr = () => <QrImageView data="1234567890" version={-1} size={200} />;
