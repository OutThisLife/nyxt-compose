import { frag, iter, raf, shallowEqual, snakeCase } from './utils'

interface IObj extends Object {
  [key: string]: any
}

interface IEventGroup {
  type: string
  events: IEvent[]
}

interface IEvent {
  selector: string
  handle: (this: any, a: IObj) => () => any
}

interface IFrag {
  $frag: DocumentFragment
  adjSelector: string
  assert: (a: IObj, b: IObj) => Promise<{}>
}

interface IPropVar {
  prop: string
  selector: string
}

interface Impl {
  el: HTMLElement
  didMount: (...a: IObj[]) => void
  didUpdate: (...a: IObj[]) => void

  _events: () => void
  _frags: () => void
  _vars: (a: IObj) => void
  _attrs: () => void

  props: any
  $propVars: IPropVar[]
  attrs: IObj
  eventBus: IEventGroup[]
  $frags: IFrag[]
}

// ------------------------------------------------------

const component: Impl = {
  el: document.body,

  didMount(...args) {
    iter([this._events, this._vars, this._attrs], (fn: () => void) => fn.apply(this, ...args))
  },

  didUpdate(...args) {
    iter([this._frags, this._vars, this._attrs], (fn: () => void) => fn.apply(this, ...args))
  },

  _events() {
    iter(
      this.eventBus,
      ({ type, events }: IEventGroup): void =>
        this.el.addEventListener(type, e =>
          iter(events, ({ selector, handle }: IEvent) => {
            let target = e.target as HTMLElement

            if (!target) {
              return -1
            }

            if (target.nodeType === 3 && target.parentElement) {
              target = target.parentElement
            }

            if (target.matches(selector)) {
              try {
                raf(() => handle(this.props))
              } catch (e) {
                console.error(e)
              }

              return -1
            }
          })
        )
    )
  },

  _frags() {
    iter(
      this.$frags,
      (obj: IFrag): -1 | void => {
        const { adjSelector, $frag, assert } = obj
        const $sibling = this.el.querySelector(adjSelector)
        const $parent = $sibling && $sibling.parentNode
        const $next = $sibling && $sibling.nextSibling

        if (!($sibling && $parent && $next)) {
          return -1
        }

        assert
          .apply(this, arguments)
          .then(() => raf(() => $parent.insertBefore($frag.cloneNode(true), $next)))
          .catch((rm: boolean) => rm && raf(() => $parent.removeChild($next)))
      }
    )
  },

  _vars(props) {
    iter(this.$propVars, (obj: IPropVar) => {
      const { prop, selector } = obj
      const $foundVars = this.el.querySelectorAll(selector)

      if (!($foundVars && prop in props)) {
        return -1
      }

      const $frag = document.createDocumentFragment()
      $frag.appendChild(document.createTextNode(props[prop]))

      iter([].slice.call($foundVars), ($var: HTMLElement) => {
        if ($var.hasAttribute('value') || $var.hasAttribute('contenteditable')) {
          delete $var.dataset.key
        }

        raf(() => $var.replaceChild($frag.cloneNode(true), $var.childNodes[0]))
      })
    })
  },

  _attrs() {
    const atts = this.attrs

    iter(Object.keys(atts), (key: any) => {
      let nv = atts[key]
      const ov = this.el.getAttribute(key)

      if (key === 'style' && typeof nv === 'object') {
        const keys = Object.keys(nv)
        const values = Object.values(nv)

        nv = keys.reduce((acc, id, idx) => {
          acc += `${snakeCase(id)}: ${values[idx]};`
          return acc
        }, '')
      }

      if (!shallowEqual(nv, ov)) {
        this.el.setAttribute(key, nv)
      }
    })
  },

  get attrs() {
    return {}
  },

  props: new Proxy(
    {},
    {
      set: (props: IObj, prop: any, nv: any, receiver: Impl): true => {
        const oldProps = Object.assign({}, props)
        const ov = oldProps[prop]

        if (!shallowEqual(ov, nv)) {
          props[prop] = nv
          receiver.didUpdate.call(receiver, props, oldProps)
        }

        return true
      }
    }
  ),

  $frags: [],
  $propVars: [],
  eventBus: []
}

// ------------------------------------------------------

export const attachComponent = (el: HTMLElement): Impl => {
  const c: Impl = Object.create(component)
  c.el = el

  c.$frags.concat([
    {
      $frag: frag('<div>toggled</div>'),
      adjSelector: '[data-key="0.0"]',
      assert: ({ toggled }, oldProps): Promise<{}> => {
        const diff = !shallowEqual(toggled, oldProps.toggled)
        return new Promise((y, n) => (toggled && diff ? y() : n(diff)))
      }
    }
  ])

  c.$propVars.concat([
    {
      prop: 'count',
      selector: '[data-key="0.1"]'
    },
    {
      prop: 'title',
      selector: '[data-key="0.4"]'
    }
  ])

  c.eventBus.push({
    events: [
      {
        handle(this: any) {
          return (): number => (this.props.toggled ^= 1)
        },
        selector: '[data-key="0.0"]'
      },
      {
        handle(this: any) {
          return (): number => (this.props.count += 1)
        },
        selector: '[data-key="0.2"]'
      },
      {
        handle(this: any) {
          return (): void => raf(() => this.el.parentNode && this.el.parentNode.removeChild(this.el))
        },
        selector: '[data-key="0.3"]'
      }
    ],
    type: 'mousedown'
  })

  raf(() => c.didMount())
  return c
}

/*

  get attrs() {
    const { toggled } = this.props

    return {
      style: {
        background: toggled ? '#f36' : '#fafafa',
        transition: '.3s ease-in-out'
      }
    }
  },

*/
