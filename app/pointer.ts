import { clamp } from "~utils/math";

export class PointerPositionChangeEvent extends Event {
  x: number;
  y: number;
  constructor({ x, y }: { x: number; y: number }, eventInitDict?: EventInit) {
    super("pointerpositionchange", eventInitDict);
    this.x = x;
    this.y = y;
  }
}

export class PointerLockChangeEvent extends Event {
  constructor(public locked: boolean, eventInitDict?: EventInit) {
    super("pointerlockchange", eventInitDict);
  }
}

export class PointerClickEvent extends Event {
  x: number;
  y: number;
  buttons: number;
  constructor(
    { x, y, buttons }: { x: number; y: number; buttons: number },
    eventInitDict?: EventInit
  ) {
    super("pointerclick", eventInitDict);
    this.x = x;
    this.y = y;
    this.buttons = buttons;
  }
}

export class PointerManager extends EventTarget {
  originalX: number = 0;
  originalY: number = 0;
  lastLockedX: number = 0;
  lastLockedY: number = 0;
  x: number = 0;
  y: number = 0;
  locked: boolean = false;
  buttons: number = 0;

  constructor() {
    super();

    // observe mousemove for unlocked state
    document.addEventListener("mousemove", (e) => {
      if (!this.locked) {
        this.originalX = e.clientX;
        this.originalY = e.clientY;
        this.setPointerPosition(e.clientX, e.clientY);
      }
    });

    document.addEventListener("mousedown", this._mousedownHandler);

    document.addEventListener("mouseup", this._mouseupHandler);

    // observe pointer lock change
    if ("onpointerlockchange" in document) {
      document.addEventListener(
        "pointerlockchange",
        this._pointerLockChangeHandler,
        false
      );
    } else if ("onmozpointerlockchange" in document) {
      (document as Document).addEventListener(
        "mozpointerlockchange",
        this._pointerLockChangeHandler,
        false
      );
    }
  }

  setPointerPosition = (x: number, y: number) => {
    this.x = clamp(0, window.innerWidth)(x);
    this.y = clamp(0, window.innerHeight)(y);
    this.dispatchEvent(
      new PointerPositionChangeEvent({ x: this.x, y: this.y })
    );
  };

  private _pointerLockChangeHandler = () => {
    this.locked = !this.locked;
    this.dispatchEvent(new PointerLockChangeEvent(this.locked));

    if (this.locked) {
      document.addEventListener("mousemove", this._mousemoveHandler, false);
      document.addEventListener("mousedown", this._mousedownHandler, false);
      document.addEventListener("mouseup", this._mouseupHandler, false);
    } else {
      this.setPointerPosition(this.originalX, this.originalY);
      document.removeEventListener("mousemove", this._mousemoveHandler, false);
      document.removeEventListener("mousedown", this._mousedownHandler, false);
      document.removeEventListener("mouseup", this._mouseupHandler, false);
    }
  };

  private _mousemoveHandler = (e: MouseEvent) => {
    this.lastLockedX = clamp(0, window.innerWidth)(this.x + e.movementX);
    this.lastLockedY = clamp(0, window.innerHeight)(this.y + e.movementY);
    this.setPointerPosition(this.lastLockedX, this.lastLockedY);
  };

  private _mousedownHandler = (e: MouseEvent) => {
    this.buttons = e.buttons;
  };

  private _mouseupHandler = (e: MouseEvent) => {
    if (this.buttons !== 0) {
      this.dispatchEvent(
        new PointerClickEvent({
          x: e.clientX,
          y: e.clientY,
          buttons: this.buttons,
        })
      );
      this.buttons = 0;
    }
  };

  lock() {
    if (document.body.requestPointerLock) {
      document.body.requestPointerLock();
    } else if (
      (document.body as { mozRequestPointerLock?: () => void })
        .mozRequestPointerLock
    ) {
      (document.body as any).mozRequestPointerLock();
    }
  }

  unlock() {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    } else if (
      (document as { mozExitPointerLock?: () => void }).mozExitPointerLock
    ) {
      (document as any).mozExitPointerLock();
    }
  }
}
