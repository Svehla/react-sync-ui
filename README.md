# [use-formio](http://use-formio.svehlik.eu)

![Use formio logo](./example/assets/useformio-horizontal.svg)

[Online interactive documentation is availabe on http://use-formio.svehlik.eu](http://use-formio.svehlik.eu)

`use-formio` is React form library which help you to build forms with just a
few lines of code and without extra layer of abstraction.

`use-formio` is micro library with 0 dependencies.

Each of your application deserves custom UI solution so it does not make sense to use separate library to handle form UIs.

In useFormio you just define custom business model and don't waste a time with boilerplate around.

## installation

```sh
npm install use-formio
```

## Examples

[you can find more examples on http://use-formio.svehlik.eu](http://use-formio.svehlik.eu)

```tsx
import * as React from "react";
import { useFormio } from "useFormio";

const delay = (time: number) => new Promise(res => setTimeout(res, time));
const maxLen3 = (value: string) => value.length <= 3

export const Example = () => {
  const form = useFormio(
    {
      firstName: "",
      lastName: ""
    },
    {
      firstName: {
        validator: value => [
          value.length > 10 ? "max len is 10" : undefined,
          value.length < 4 ? "min len is 4" : undefined
        ]
      },
      lastName: {
        validator: async (value, state) => {
          if (state.age > 20) {
            await delay(1000);
            return Math.random() > 0.5 ? "Random error thrower" : undefined;
          }
          return undefined
        }
      }
      age: {
        validator: value => [
          value === "" ? "input cannot be empty" : undefined,
          parseInt(value) < 18 ? "age has to be > 18" : undefined
        ],
        shouldChangeValue: maxLen3
      },
      isVerified: {
        validator: value => (value === false ? "value has to be checked" : undefined)
      }
    }
  );
  const f = form.fields;

  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        const [isValid, errors] = await form.validate();
        if (isValid) {
          alert("Successfully submitted");
        } else {
          console.error(errors)
        }
      }}
    >
      <label>First name</label>
      <input
        type="text"
        onChange={e => f.firstName.set(e.target.value)}
        value={f.firstName.value}
        onBlur={() => f.firstName.validate()}
        disabled={f.firstName.isValidating}
      />
      <div className="input-error">{f.firstName.errors.join(",")}</div>

      <label>Last name</label>
      <input
        type="text"
        onChange={e => f.lastName.set(e.target.value)}
        value={f.lastName.value}
        onBlur={() => f.lastName.validate()}
        disabled={f.lastName.isValidating}
      />
      <div className="input-error">{f.lastName.errors.join(",")}</div>

      <label>Age</label>
      <input type="number" onChange={e => f.age.set(e.target.value)} value={f.age.value} />

      <div className="input-error">{f.age.errors.join(",")}</div>

      <label>Terms of conditions</label>
      <input
        type="checkbox"
        checked={f.isVerified.value}
        onChange={e => f.isVerified.set(e.target.checked)}
      />

      <button type="submit" disabled={form.isValidating}>
        submit
      </button>
    </form>
  );
};
```
