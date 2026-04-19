export interface InputFrame {
  seq: number;
  accel: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
  shoot: boolean;
}

export interface InputBatch {
  frames: InputFrame[];
}

export const INPUT_MESSAGE = 'input';
