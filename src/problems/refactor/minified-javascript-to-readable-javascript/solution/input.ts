(function (globalObject, createEventBusConstructor) {
	if (typeof exports === 'object' && typeof module === 'object') {
		module.exports = createEventBusConstructor();
		return;
	}

	if (typeof define === 'function' && define.amd) {
		define([], createEventBusConstructor);
		return;
	}

	globalObject.EventBus = createEventBusConstructor();
})(this, function () {
	function EventBus() {
		this._events = {};
	}

	/**
	 * Register a listener for an event.
	 */
	EventBus.prototype.on = function (eventName, listener, context) {
		var listeners = this._events[eventName] || (this._events[eventName] = []);
		listeners.push({fn: listener, ctx: context || this, once: false});
		return this;
	};

	/**
	 * Register a listener that runs once.
	 */
	EventBus.prototype.once = function (eventName, listener, context) {
		var eventBus = this;

		function wrappedOnceListener() {
			eventBus.off(eventName, wrappedOnceListener);
			listener.apply(context || eventBus, arguments);
		}

		wrappedOnceListener._fn = listener;
		return this.on(eventName, wrappedOnceListener, context);
	};

	/**
	 * Emit an event with optional arguments.
	 */
	EventBus.prototype.emit = function (eventName) {
		var listeners = this._events[eventName];
		if (!listeners) {
			return this;
		}

		var args = [].slice.call(arguments, 1);
		var listenersSnapshot = listeners.slice();
		for (var index = 0, total = listenersSnapshot.length; index < total; index++) {
			listenersSnapshot[index].fn.apply(listenersSnapshot[index].ctx, args);
		}

		return this;
	};

	/**
	 * Remove listeners for an event.
	 */
	EventBus.prototype.off = function (eventName, listener) {
		var listeners = this._events[eventName];
		if (!listeners) {
			return this;
		}

		if (!listener) {
			delete this._events[eventName];
			return this;
		}

		for (var index = listeners.length - 1; index >= 0; index--) {
			if (listeners[index].fn === listener || listeners[index].fn._fn === listener) {
				listeners.splice(index, 1);
				if (!listeners.length) {
					delete this._events[eventName];
				}
			}
		}

		return this;
	};

	/**
	 * Remove all event listeners.
	 */
	EventBus.prototype.clear = function () {
		this._events = {};
		return this;
	};

	return EventBus;
});
