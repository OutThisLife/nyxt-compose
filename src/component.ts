import { frag, iter, raf, shallowEqual } from './utils'

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

interface INYXT extends HTMLElement {
  __nyxt__: Impl
}

interface Impl {
  el: INYXT
  mounted: boolean

  didMount: (...a: IObj[]) => Impl
  setProps: (a: IObj) => IObj
  didUpdate: (...a: IObj[]) => Impl
  willUnmount: () => Impl

  _addEvents: () => Impl
  _parseCondElements: () => Impl
  _parseVariables: (a: IObj) => Impl

  props?: IObj
  $vars: IPropVar[]
  $events: IEventGroup[]
  $frags: IFrag[]
}

// ------------------------------------------------------

const component: Impl = {
  el: document.body,
  mounted: false,

  didMount(...args) {
    this.mounted = true
    iter([this._addEvents, this._parseVariables], (fn: () => void) => fn.apply(this, ...args))
    return this
  },

  didUpdate(...args) {
    if (this.mounted) {
      iter([this._parseCondElements, this._parseVariables], (fn: () => void) => fn.apply(this, ...args))
    }

    return this
  },

  async setProps(newProps) {
    if (this.props instanceof Object) {
      const keys = Object.keys(newProps)

      await iter(keys, (prop: string) =>
        Object.defineProperty(this.props, prop, {
          value: newProps[prop]
        })
      )
    }

    return this
  },

  willUnmount() {
    // noop
    if (this.el.parentElement) {
      this.el.parentElement.removeChild(this.el)
    }

    return this
  },

  _addEvents() {
    iter(this.$events, ({ type, events }: IEventGroup) => {
      this.el.addEventListener(type, e =>
        iter(
          events,
          ({ selector, handle }: IEvent): -1 | void => {
            let target = e.target as HTMLElement

            if (!target) {
              return -1
            }

            if (target.nodeType === 3 && target.parentElement) {
              target = target.parentElement
            }

            if (target.matches(selector)) {
              try {
                raf(() => handle(this.props || {})())
              } catch (e) {
                console.trace(e)
              }

              return -1
            }
          }
        )
      )
    })

    return this
  },

  _parseCondElements() {
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

    return this
  },

  _parseVariables(props) {
    iter(
      this.$vars,
      (obj: IPropVar): -1 | void => {
        const { prop, selector } = obj
        const $foundVars = this.el.querySelectorAll(selector)

        if (!($foundVars && prop in props)) {
          return -1
        }

        const $frag = document.createDocumentFragment()
        $frag.appendChild(document.createTextNode(props[prop]))

        iter([].slice.call($foundVars), ($var: HTMLElement) => {
          raf(() => $var.replaceChild($frag.cloneNode(true), $var.childNodes[0]))
        })
      }
    )

    return this
  },

  $events: [],
  $frags: [],
  $vars: []
}

// ------------------------------------------------------

export const attachComponent = async (el: HTMLElement, initialProps: IObj = {}): Promise<Impl> => {
  const c: Impl = Object.create(component)

  if (el.hasOwnProperty('__nyxt__')) {
    return (el as INYXT).__nyxt__
  }

  Object.defineProperty(el, '__nyxt__', { value: c })
  Object.defineProperty(c, 'el', { value: el })
  Object.defineProperty(c, 'props', {
    value: new Proxy(
      {},
      {
        set: (props: IObj, prop: string, nv: any): boolean => {
          const oldProps = Object.assign({}, props)
          const ov = oldProps[prop]

          if (!shallowEqual(ov, nv)) {
            props[prop] = nv
            c.didUpdate.call(c, props, oldProps)

            return true
          }

          return false
        },

        get: (props: IObj, prop: string): any => {
          if (prop in props) {
            return props[prop]
          }

          return undefined
        }
      }
    )
  })

  await c.setProps(initialProps)

  c.$vars.concat([
    {
      prop: 'count',
      selector: '[data-key="0.1"]'
    },
    {
      prop: 'title',
      selector: '[data-key="0.4"]'
    }
  ])

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

  c.$events.push({
    events: [
      {
        handle() {
          return (): number => (c.props ? ((c.props.toggled as number) ^= 1) : 0)
        },
        selector: '[data-key="0.0"]'
      },
      {
        handle() {
          return (): number => (c.props ? (c.props.count += 1) : 0)
        },
        selector: '[data-key="0.2"]'
      },
      {
        handle() {
          return () => raf(() => c.el.parentNode && c.el.parentNode.removeChild(c.el))
        },
        selector: '[data-key="0.3"]'
      }
    ],
    type: 'mousedown'
  })

  return raf(() => c.didMount()), c
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
