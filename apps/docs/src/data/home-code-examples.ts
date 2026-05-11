export const counterElementExampleCode = `import { RadiantElement, customElement, prop } from '@ecopages/radiant';

@customElement('radiant-counter')
export class RadiantCounter extends RadiantElement<{ value: number }> {
  @prop({ type: Number, reflect: true }) value = 0;

  private readonly decrement = () => {
    if (this.value > 0) this.value -= 1;
  };

  private readonly increment = () => {
    this.value += 1;
  };

  override render() {
    return (
      <>
        <button type="button" on:click={this.decrement}>-</button>
        <span>{this.$.value}</span>
        <button type="button" on:click={this.increment}>+</button>
      </>
    );
  }
}`;

export const counterControllerExampleCode = `import { RadiantController, controller, prop } from '@ecopages/radiant';

@controller('radiant-counter')
export class RadiantCounter extends RadiantController<{ value: number }> {
  @prop({ type: Number, reflect: true }) value = 0;

  private readonly decrement = () => {
    if (this.value > 0) this.value -= 1;
  };

  private readonly increment = () => {
    this.value += 1;
  };

  override render() {
    return (
      <>
        <button type="button" on:click={this.decrement}>-</button>
        <span>{this.$.value}</span>
        <button type="button" on:click={this.increment}>+</button>
      </>
    );
  }
}`;
