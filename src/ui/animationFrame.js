export default class AnimationFrame {
  /**
   * Method will be called with this=Window
   * @param callback
   */
  static frame(callback) {
    if (typeof callback === 'function') {
      window.callback = callback;
    }
    window.callback();
    window.requestAnimationFrame(window.frame);
  }

  static stop() {}
}