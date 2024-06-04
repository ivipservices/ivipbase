import React, { useCallback, useEffect, useState } from "react";

const localStorage = window.localStorage;

const isJson = (str) => {
	try {
		JSON.parse(str);
	} catch (e) {
		return false;
	}
	return true;
};

class Storager {
	constructor(conf = {}) {
		this.data = {};
		this.listeners = {};
		this.getKeys =
			typeof conf.getKeys === "function"
				? conf.getKeys
				: () => {
						return Object.keys(this.data);
				  };
	}

	get(key) {
		return this.data[key];
	}

	set(key, data) {
		let isIguals = false;

		if (this.getKeys().includes(key)) {
			if (data === this.data[key] || (isJson(data) && isJson(this.data[key]) && JSON.stringify(data) === JSON.stringify(this.data[key]))) {
				isIguals = true;
			}
		}

		this.data[key] = data;
		if (this.listeners[key] && !isIguals) {
			for (let i = 0; i < this.listeners[key].length; i++) {
				if (typeof this.listeners[key][i] === "function") {
					this.listeners[key][i](data);
				}
			}
		}

		const self = this;

		return {
			get() {
				return self.data[key];
			},
			delete() {
				self.delete(key);
			},
			addListener(callback) {
				return self.addListener(key, callback);
			},
			deleteListener(callback) {
				self.deleteListener(key, callback);
			},
			deleteListeners() {
				self.deleteListeners(key);
			},
		};
	}

	push(key, data) {
		if (!this.data[key]) {
			this.data[key] = [];
		} else if (Array.isArray(this.data[key]) !== true) {
			return;
		}

		this.data[key] = this.data[key].concat([data]);

		if (this.listeners[key]) {
			for (let i = 0; i < this.listeners[key].length; i++) {
				if (typeof this.listeners[key][i] === "function") {
					this.listeners[key][i](this.data[key]);
				}
			}
		}
	}

	hasKey(key) {
		return this.getKeys().includes(key);
	}

	delete(key) {
		delete this.data[key];
		if (this.listeners[key]) {
			for (let i = 0; i < this.listeners[key].length; i++) {
				if (typeof this.listeners[key][i] === "function") {
					this.listeners[key][i](undefined);
				}
			}
			delete this.listeners[key];
		}
	}

	eraseAll() {
		this.data = {};
		for (let key in this.listeners) {
			for (let i = 0; i < this.listeners[key].length; i++) {
				if (typeof this.listeners[key][i] === "function") {
					this.listeners[key][i](undefined);
				}
			}
			delete this.listeners[key];
		}
	}

	/**
	 *
	 * @param {string} key
	 * @param {function(any)} callback
	 */
	addListener(key, callback) {
		if (!callback || typeof callback !== "function")
			return {
				index: null,
				stop: () => {},
			};

		if (!this.listeners[key]) this.listeners[key] = [];

		let indexFunction = null;

		this.listeners[key].forEach((f, i) => {
			if (callback === f) {
				indexFunction = i;
				this.listeners[key][i] = callback;
			}
		});

		if (indexFunction === null) {
			indexFunction = this.listeners[key].length;
			this.listeners[key].push(callback);
		}

		return {
			index: indexFunction,
			stop: () => {
				if (key in this.listeners && typeof indexFunction === "boolean" && typeof this.listeners[key][indexFunction] === "function") {
					delete this.listeners[key][indexFunction];
				}
			},
		};
	}

	deleteListener(key, callback) {
		if (typeof key === "object" && typeof key.stop === "function") {
			return key.stop();
		}

		if (!(typeof key === "string" && key in this.listeners)) {
			return;
		}

		if (typeof callback === "function") {
			this.listeners[key].forEach((f, i) => {
				if (f === callback) {
					delete this.listeners[key][i];
				}
			});
		} else if (typeof callback === "number" && callback >= 0 && callback < this.listeners[key].length) {
			delete this.listeners[key][callback];
		} else if (typeof callback === "object" && typeof callback.stop === "function") {
			callback.stop();
		} else {
			delete this.listeners[key];
		}
	}

	deleteListeners(key) {
		for (let key in this.listeners) {
			delete this.listeners[key];
		}
	}
}

class DataStorager extends Storager {
	constructor() {
		super();
	}
}

class LocalStorager extends Storager {
	constructor() {
		const getKeys = () =>
			Object.keys(localStorage)
				.filter((k) => k.search("LocalStorager_") === 0)
				.map((k) => k.replace("LocalStorager_", ""));

		super({
			getKeys: getKeys,
		});

		let data = {};

		const getItem = (key) => {
			let obj = localStorage.getItem("LocalStorager_" + key);
			if (!obj || isJson(obj) !== true) {
				return null;
			}
			obj = JSON.parse(obj);
			return obj?.value;
		};

		const setItem = (key, value) => {
			localStorage.setItem("LocalStorager_" + key, JSON.stringify({ value: value, lastUpdate: new Date().getTime() }));
		};

		const deleteItem = (key) => {
			localStorage.removeItem("LocalStorager_" + key);
		};

		getKeys().forEach((key) => {
			data[key] = getItem(key);
		});

		this.data = new Proxy(Object.assign(this.data, data), {
			get: function (target, prop, receiver) {
				return getKeys().includes(prop) && Object.keys(target).includes(prop) !== true ? getItem(prop) : Reflect.get(target, prop, receiver);
			},
			set: function (target, prop, value, receiver) {
				setItem(prop, value);
				return Reflect.set(target, prop, value, receiver);
			},
			deleteProperty: function (target, prop) {
				if (prop in target) {
					deleteItem(prop);
					delete target[prop];
				}
				return true;
			},
		});

		this.listeners = {};
	}
}

class MultiStorager {
	constructor() {
		if (!(window.__DataStorager && window.__DataStorager instanceof DataStorager)) {
			window.__DataStorager = new DataStorager();
		}

		this.DataStorager = window.__DataStorager;

		if (!(window.__LocalStorager && window.__LocalStorager instanceof LocalStorager)) {
			window.__LocalStorager = new LocalStorager();
		}

		this.LocalStorager = window.__LocalStorager;

		this.cache = {};
	}

	getDataStorager(key) {
		key = typeof key === "string" ? "DataStorager_key_" + key : undefined;
		if (!key) {
			return;
		}
		if (!this.cache[key]) {
			this.cache[key] = new DataStorager();
		}
		return this.cache[key];
	}

	getLocalStorager(key) {
		key = typeof key === "string" ? "LocalStorager_key_" + key : undefined;
		if (!key) {
			return;
		}
		if (!this.cache[key]) {
			this.cache[key] = new LocalStorager();
		}
		return this.cache[key];
	}
}

const __MultiStorager = new MultiStorager();

window.MultiStorager = __MultiStorager;

export const useDataStorager = (key, defaultValue) => {
	const [value, setValue] = useState(defaultValue);

	useEffect(() => {
		if (typeof key !== "string" || key.trim() === "") {
			return;
		}
		const hasValue = __MultiStorager.DataStorager.hasKey(key);
		if (hasValue) {
			setValue((v) => __MultiStorager.DataStorager.get(key));
		} else {
			__MultiStorager.DataStorager.set(key, defaultValue);
		}

		const listener = __MultiStorager.DataStorager.addListener(key, (value) => {
			setValue((v) => value);
		});

		return () => {
			listener.stop();
		};
	}, [key, defaultValue]);

	const setStorage = useCallback(
		(value) => {
			__MultiStorager.DataStorager.set(key, value);
		},
		[key],
	);

	return [value ?? defaultValue, setStorage];
};

window.useDataStorager = useDataStorager;

export const useLocalStorager = (key, defaultValue) => {
	const [value, setValue] = useState(defaultValue);

	useEffect(() => {
		if (typeof key !== "string" || key.trim() === "") {
			return;
		}
		const hasValue = __MultiStorager.LocalStorager.hasKey(key);
		if (hasValue) {
			setValue((v) => __MultiStorager.LocalStorager.get(key));
		} else {
			__MultiStorager.LocalStorager.set(key, defaultValue);
		}

		const listener = __MultiStorager.LocalStorager.addListener(key, (value) => {
			setValue((v) => value);
		});

		return () => {
			listener.stop();
		};
	}, [key, defaultValue]);

	const setStorage = useCallback(
		(value) => {
			__MultiStorager.LocalStorager.set < t > (key, value);
		},
		[key],
	);

	return [value, setStorage];
};

window.useLocalStorager = useLocalStorager;

export default __MultiStorager;
