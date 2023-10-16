// Storage Mock
export function storageMock() {
    let storage = new Map();

    return {
        setItem: function(key, value) {
            storage.set(key, value);
        },
        getItem: function(key) {
            return storage.has(key) ? storage.get(key) : null;
        },
        clear: function() {
            storage.clear();
        },
        removeItem: function(key) {
            storage.delete(key);
        },
        get length() {
            return storage.size;
        },
        key: function(index) {
            const keys = storage.keys();

            let i = 0;
            for (const key of keys) {
                if (index === i) {
                    return key;
                }
                i++;
            }

            return null;
        }
    };
}