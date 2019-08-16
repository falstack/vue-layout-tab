export default class {
  /**
   *  sticky：默认为 true，滑动的时候会跟随手指
   *  swipe：默认为 true，touchend 时会翻到下一页或返回上一页
   */
  constructor(options = {}) {
    if (!(options.el instanceof Element)) {
      return
    }
    this._calcCssPrefix()
    this._setupConst()
    this._setupProps(options)
    this._setupSizes()
    this._setupIndex()
    this._setupStyle()
    this._setupTouchEvents()
    this._setupScrollEvent()
    this._setupResizeEvent()
    return this
  }

  _setupTouchEvents() {
    const { el, events } = this
    events.touchstart = this._start.bind(this)
    events.touchmove = this._move.bind(this)
    events.touchend = this._end.bind(this)
    el.addEventListener('touchstart', events.touchstart, {
      capture: true,
      passive: true
    })
    el.addEventListener('touchmove', events.touchmove, true)
    el.addEventListener('touchend', events.touchend, {
      capture: true,
      passive: true
    })
  }

  _setupScrollEvent() {
    if (this.slideCount > 1) {
      const scroll = this._scroll.bind(this)
      this.events.scroll = scroll
      ;[].forEach.call(this.el.children, item => {
        item.addEventListener('scroll', scroll, true)
      })
    }
  }

  _setupResizeEvent() {
    this.events.resize = this._setupSizes.bind(this)
    window.addEventListener('resize', this.events.resize, {
      capture: false,
      passive: true
    })
  }

  _setupConst() {
    this.startPoint = {
      x: 0,
      y: 0
    }
    this.deltaPoint = {
      x: 0,
      y: 0
    }
    this.lastLeft = 0
    this.currentLeft = 0
    this.scrolling = false
    this.touching = false
    this.moving = false
    this.startAt = 0
    this.timeoutLock = 0
    this.events = {}
  }

  _setupProps(options) {
    this.el = options.el
    this.style = options.el.style
    this.duration =
      options.duration === undefined ? 300 : Math.abs(options.duration)
    this.sticky = options.sticky === undefined ? true : options.sticky
    this.swipe = options.swipe === undefined ? true : options.swipe
    this.disabled = options.disabled || false
    this.callback = options.callback
    this.slideCount = Math.max(options.count || 1, 1)
    this.activeIndex = options.index
      ? Math.max(Math.min(options.index, this.slideCount - 1), 0)
      : 0
  }

  _setupStyle() {
    const { style, slideCount, slideWidth } = this
    style.willChange = 'transform'
    style.width = `${slideCount * 100}%`
    if (slideCount > 1) {
      const children = this.el.children
      ;[].forEach.call(children, item => {
        const { style } = item
        style.width = `${slideWidth}px`
        style.float = 'left'
      })
    }
  }

  _setupIndex() {
    if (!this.activeIndex) {
      return
    }
    const left = (-this.activeIndex * this.maxLeft) / (this.slideCount - 1)
    this.lastLeft = left
    this.currentLeft = left
    this._translate(left)
  }

  _setupSizes() {
    const offsetWidth = this.el.parentNode.offsetWidth
    this.slideWidth = offsetWidth
    this.maxLeft = offsetWidth * this.slideCount - offsetWidth
  }

  _scroll(event) {
    if (this.touching) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    clearTimeout(this.timeoutLock)
    this.scrolling = true
    this.timeoutLock = setTimeout(() => {
      this.scrolling = false
    }, 250)
  }

  _start(event) {
    if (this.moving || this.disabled || this.scrolling) {
      return
    }
    const point = event.touches[0]
    this.startPoint = {
      x: point.pageX,
      y: point.pageY
    }
    this.startAt = +new Date()
  }

  _move(event) {
    if (this.moving || this.disabled || this.scrolling) {
      return
    }
    const point = event.touches[0]
    const start = this.startPoint
    const delta = {
      x: point.pageX - start.x,
      y: point.pageY - start.y
    }
    this.deltaPoint = delta
    if (this._isVerticalScroll(delta)) {
      return
    }
    this.touching = true
    const lastLeft = this.lastLeft
    let resultX = delta.x + lastLeft
    if (resultX > 0) {
      resultX = 0
    } else if (resultX + this.maxLeft < 0) {
      resultX = -this.maxLeft
    }
    if (resultX === this.currentLeft) {
      return
    }
    if (this.sticky) {
      this._translate(resultX)
      this.currentLeft = resultX
    }
  }

  _end() {
    if (this.moving || this.disabled || this.scrolling) {
      return
    }
    this.lastLeft = this.currentLeft
    this.touching = false
    const delta = this.deltaPoint
    if (!this.sticky && this._isVerticalScroll(delta)) {
      return
    }
    if (this.swipe) {
      delta.x > 0 ? this.prev(false) : this.next(false)
    } else {
      this._calcActiveIndex(delta.x < 0)
    }
  }

  prev(custom = true) {
    if (this.activeIndex === 0) {
      return
    }
    if (custom) {
      this.activeIndex--
    } else if (this._isValidSlide()) {
      this._calcActiveIndex(false)
    }
    this._animation()
  }

  next(custom = true) {
    if (this.activeIndex === this.slideCount - 1) {
      return
    }
    if (custom) {
      this.activeIndex++
    } else if (this._isValidSlide()) {
      this._calcActiveIndex(true)
    }
    this._animation()
  }

  destroy() {
    const { el, events } = this
    el.removeEventListener('touchstart', events.touchstart, {
      capture: true,
      passive: true
    })
    el.removeEventListener('touchmove', events.touchmove, true)
    el.removeEventListener('touchend', events.touchend, {
      capture: true,
      passive: true
    })
    window.removeEventListener('resize', events.resize, {
      capture: false,
      passive: true
    })
    if (this.slideCount > 1) {
      const scroll = this.events.scroll
      ;[].forEach.call(this.el.children, item => {
        item.removeEventListener('scroll', scroll, true)
      })
    }
  }

  _animation() {
    if (this.moving) {
      return
    }
    this.moving = true
    const { cssPrefix, duration, activeIndex } = this
    const left = -activeIndex * this.slideWidth
    requestAnimationFrame(() => {
      this.style[`${cssPrefix}transition-duration`] = `${duration}ms`
      this.style[`${cssPrefix}transform`] = `translateX(${left}px)`
      setTimeout(() => {
        this.style[`${cssPrefix}transition-duration`] = ''
        this.currentLeft = left
        this.lastLeft = left
        this.moving = false
        this.callback && this.callback(activeIndex)
      }, duration)
    })
  }

  _translate(left) {
    requestAnimationFrame(() => {
      this.style[`${this.cssPrefix}transform`] = `translateX(${left}px)`
    })
  }

  _isVerticalScroll(delta) {
    return Math.abs(delta.x) < Math.abs(delta.y) * 3
  }

  _calcCssPrefix() {
    let result = ''
    const regex = /^(Webkit|Khtml|Moz|ms|O)(?=[A-Z])/
    const styleDeclaration = document.getElementsByTagName('script')[0].style
    for (const prop in styleDeclaration) {
      if (regex.test(prop)) {
        result = '-' + prop.match(regex)[0].toLowerCase() + '-'
      }
    }

    if (!result && 'WebkitOpacity' in styleDeclaration) {
      result = '-webkit-'
    }
    if (!result && 'KhtmlOpacity' in styleDeclaration) {
      result = '-khtml-'
    }
    this.cssPrefix = result
  }

  _calcActiveIndex(isNext) {
    if (this.sticky) {
      this.activeIndex = isNext
        ? Math.ceil(Math.abs(this.currentLeft) / this.slideWidth)
        : Math.floor(Math.abs(this.currentLeft) / this.slideWidth)
    } else {
      isNext ? this.activeIndex++ : this.activeIndex--
    }
  }

  _isValidSlide() {
    const x = Math.abs(this.deltaPoint.x)
    return (
      (Number(+new Date() - this.startAt) < 250 && x > 20) ||
      x < this.slideWidth / 2
    )
  }
}
