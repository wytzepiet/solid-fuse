declare const flutterMode: 'development' | 'profile' | 'release';

declare function sendMessage(channel: string, message: string): void;

declare namespace fjs {
  function bridge_call(data: any): any;
}


declare var __fuseFlush: () => void;
