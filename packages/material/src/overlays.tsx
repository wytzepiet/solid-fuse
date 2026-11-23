import { AlertDialog } from "#fuse/material_ui";
import { Modal } from "solid-fuse";
import { icon, label, type IconSlot, type Label } from "./slots";
import type { Color } from "#fuse/flutter";

export interface DialogProps {
  open: boolean;
  /** Called with false when the user dismisses it. */
  onOpenChange?: (open: boolean) => void;
  title?: Label;
  icon?: IconSlot;
  /** Buttons along the bottom, usually `<Button variant="text">`s. */
  actions?: JSX.Element | JSX.Element[];
  /** Tapping outside closes it. Default true. */
  dismissible?: boolean;
  /** Let the content scroll when it is too tall. */
  scrollable?: boolean;
  /** The content. A string is the message. */
  children?: Label;
}

/** Material's alert dialog, open while `open` is true. */
export function Dialog(props: DialogProps) {
  return (
    <Modal type="materialDialog" open={props.open} onOpenChange={props.onOpenChange} dismissible={props.dismissible}>
      <AlertDialog
        title={label(props.title)}
        icon={icon(props.icon)}
        content={label(props.children)}
        actions={props.actions}
        scrollable={props.scrollable}
      />
    </Modal>
  );
}

export interface BottomSheetProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Default true. */
  dismissible?: boolean;
  /** Drag down to close. Default true. */
  enableDrag?: boolean;
  showDragHandle?: boolean;
  /** Let the sheet be taller than half the screen. */
  fullHeight?: boolean;
  backgroundColor?: Color;
  children?: JSX.Element;
}

/** A modal sheet from the bottom, open while `open` is true. */
export function BottomSheet(props: BottomSheetProps) {
  return (
    <Modal
      type="materialBottomSheet"
      open={props.open}
      onOpenChange={props.onOpenChange}
      dismissible={props.dismissible}
      enableDrag={props.enableDrag}
      showDragHandle={props.showDragHandle}
      scrollControlled={props.fullHeight}
      backgroundColor={props.backgroundColor}
    >
      {props.children}
    </Modal>
  );
}
