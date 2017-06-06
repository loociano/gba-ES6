export default class View {

  /**
   * @param {HTMLDocument} document
   */
  constructor(document){
    if (typeof document !== 'object') throw new Error('MissingDocument');
    this._document = document;
  }

  /**
   * @param target
   * @param type
   * @param callback
   */
  static on(target, type, callback) {
    target.addEventListener(type, callback);
  }

  /**
   * @param event
   * @param handler
   * @public
   */
  bind(event, handler) {
    if (event === 'setFlag') {
      const $flags = this._document.querySelectorAll('#flags input[type="checkbox"]');
      $flags.forEach(
        ($flag) => View.on($flag, 'click', () => handler($flag.id, $flag.checked))
      );
    }
  }
}