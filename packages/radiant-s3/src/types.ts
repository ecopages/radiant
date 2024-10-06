export type Constructor = { new (...args: any[]): NonNullable<unknown> };

export type ConstructorParams<T extends Constructor> = ConstructorParameters<T>;

export type Context = {
  kind: string;
  name: string | symbol;
  access: {
    get?(): unknown;
    set?(value: unknown): void;
    has?(value: unknown): boolean;
  };
  private?: boolean;
  static?: boolean;
  addInitializer?(initializer: () => void): void;
};

export type ClassDecorator = <T extends Constructor>(target: T, context: Context) => T | void;

export type Method = (...args: any[]) => any;
