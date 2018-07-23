import { shallowEqual, frag, iter, snakeCase } from './utils'

const attachComponent = (el, ...args) => {
  const IMPL = Object.create({
    didMount: function() {
      iter([this._vars, this._attrs], fn => fn.apply(this, arguments))

      iter(IMPL.events, ({ type, events }) =>
        el.addEventListener(type, e =>
          iter(events, ({ selector, handle }) => {
            if (e.target.matches(selector)) {
              try {
                window.requestAnimationFrame(() => handle.call(IMPL, e)(IMPL.props))
              } catch (e) {
                console.error(e)
              }

              return -1
            }
          })
        )
      )
    },

    didUpdate: function() {
      iter([this._vars, this._attrs, this._frags], fn => fn.apply(this, arguments))
    },

    _frags: function() {
      iter(this.$frags, fragment => {
        const { adjSelector } = fragment
        const $sibling = el.querySelector(adjSelector)

        if (!$sibling) {
          return -1
        }

        const { $frag, assert } = fragment

        assert
          .apply(this, arguments)
          .then(() => $sibling.parentNode.insertBefore($frag.cloneNode(true), $sibling.nextSibling))
          .catch(kill => kill && $sibling.parentNode.removeChild($sibling.nextSibling))
      })

      return this
    },

    _vars: function(props) {
      iter(this.$propVars, propVar => {
        const { prop, selector } = propVar
        const $var = el.querySelector(selector)

        if (!($var && prop in props)) {
          return -1
        }

        const $frag = document.createDocumentFragment()
        $frag.appendChild(document.createTextNode(props[prop]))
        $var.replaceChild($frag, $var.childNodes[0])
      })
    },

    _attrs: function() {
      const atts = this.attrs

      iter(Object.keys(atts), key => {
        let nv = atts[key]
        const ov = el.getAttribute(key)

        if (key === 'style' && typeof nv === 'object') {
          const keys = Object.keys(nv)
          const values = Object.values(nv)

          nv = keys.reduce((acc, id, idx) => {
            acc += `${snakeCase(id)}: ${values[idx]};`
            return acc
          }, '')
        }

        if (!shallowEqual(nv, ov)) {
          el.setAttribute(key, nv)
        }
      })
    }
  })

  Object.defineProperty(IMPL, 'props', {
    writable: true,
    value: new Proxy(
      {
        count: 0,
        toggled: 0
      },
      {
        set: (props, prop, nv) => {
          const oldprops = Object.assign({}, props)
          const ov = oldprops[prop]

          if (!shallowEqual(ov, nv)) {
            props[prop] = nv
            IMPL.didUpdate.call(IMPL, props, oldprops)
          }

          return 1
        }
      }
    )
  })

  Object.defineProperty(IMPL, 'attrs', {
    get: function() {
      return {
        title: 'world, halt',
        rel: this.props.count < 5 ? 'invalid' : 'awesome',
        style: {
          padding: '25px',
          background: this.props.toggled ? 'red' : 'blue',
          transition: '.3s ease-in-out'
        }
      }
    }
  })

  Object.defineProperty(IMPL, 'events', {
    value: [
      {
        type: 'click',
        events: [
          {
            selector: '[data-key="0.0"]',
            handle: function() {
              return ({ count, toggled }) => (this.props.toggled ^= 1)
            }
          },
          {
            selector: '[data-key="0.2"]',
            handle: function() {
              return ({ count, toggled }) => (this.props.count += 1)
            }
          }
        ]
      }
    ]
  })

  Object.defineProperty(IMPL, '$frags', {
    value: [
      {
        $frag: frag('<div>toggled</div>'),
        adjSelector: '[data-key="0.0"]',
        assert: (props, oldprops) => {
          const diff = !shallowEqual(props.toggled, oldprops.toggled)
          return new Promise((y, n) => (props.toggled && diff ? y() : n(diff)))
        }
      }
    ]
  })

  Object.defineProperty(IMPL, '$propVars', {
    value: [
      {
        prop: 'count',
        selector: '[data-key="0.1"]'
      }
    ]
  })

  window.requestAnimationFrame(() => IMPL.didMount.call(IMPL, IMPL.props))
}

iter(document.getElementsByTagName('div'), el => attachComponent(el))
