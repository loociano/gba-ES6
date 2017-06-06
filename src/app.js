import Model from './ui/model';
import View from './ui/view';
import Controller from './ui/controller';

new Controller(new Model(), new View(window.document));