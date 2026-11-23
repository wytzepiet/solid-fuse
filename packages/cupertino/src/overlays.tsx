import {
  CupertinoActionSheet, CupertinoActionSheetAction, CupertinoAlertDialog, CupertinoDialogAction,
} from "#fuse/cupertino_ui";
import { Modal } from "solid-fuse";
import { label, type Label } from "./slots";

export interface DialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: Label;
  /** `DialogAction`s. */
  actions?: JSX.Element | JSX.Element[];
  /** Tapping outside closes it. Default false, as on iOS. */
  dismissible?: boolean;
  /** The message. */
  children?: Label;
}

/** iOS alert, open while `open` is true. */
export function Dialog(props: DialogProps) {
  return (
    <Modal type="cupertinoDialog" open={props.open} onOpenChange={props.onOpenChange} dismissible={props.dismissible}>
      <CupertinoAlertDialog title={label(props.title)} content={label(props.children)} actions={props.actions} />
    </Modal>
  );
}

export interface DialogActionProps {
  onPress?: () => void;
  /** Bold: the action Return picks. */
  default?: boolean;
  /** Red: deletes or can't be undone. */
  destructive?: boolean;
  children?: Label;
}

export function DialogAction(props: DialogActionProps) {
  return (
    <CupertinoDialogAction onPressed={props.onPress ?? null} isDefaultAction={props.default} isDestructiveAction={props.destructive}>
      {label(props.children)!}
    </CupertinoDialogAction>
  );
}

export interface ActionSheetProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: Label;
  message?: Label;
  /** `ActionSheetAction`s. */
  children?: JSX.Element;
  /** Apart from the others, at the bottom. */
  cancel?: JSX.Element;
}

/** iOS action sheet, sliding up while `open` is true. */
export function ActionSheet(props: ActionSheetProps) {
  return (
    <Modal type="cupertinoActionSheet" open={props.open} onOpenChange={props.onOpenChange}>
      <CupertinoActionSheet
        title={label(props.title)}
        message={label(props.message)}
        actions={props.children}
        cancelButton={props.cancel}
      />
    </Modal>
  );
}

export interface ActionSheetActionProps {
  onPress: () => void;
  default?: boolean;
  destructive?: boolean;
  children?: Label;
}

export function ActionSheetAction(props: ActionSheetActionProps) {
  return (
    <CupertinoActionSheetAction onPressed={props.onPress} isDefaultAction={props.default} isDestructiveAction={props.destructive}>
      {label(props.children)!}
    </CupertinoActionSheetAction>
  );
}
