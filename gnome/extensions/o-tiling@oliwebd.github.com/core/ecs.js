/// A generational entity ID
///
/// Solves the ABA problem by tagging indexes with generations. The generation is used to
/// determine if an entity is the same entity as the one which previously owned an
/// assigned component at a given index.
///
/// # Implementation Notes
///
/// - The first 32-bit integer is the index.
/// - The second 32-bit integer is the generation.
export function entity_eq(a, b) {
    return a[0] === b[0] && a[1] === b[1];
}

export function entity_new(pos, gen) {
    return [pos, gen];
}

/// Storages hold components of a specific type, and define these associations on entities
///
/// # Implementation Notes
///
/// Consists of an `Array` which uses the entity ID as the index into that array. Each
/// value in the array is an array which contains the entity's generation, and the
/// component which was assigned to it. The generation is used to determine if an
/// assigned component is stale on component lookup.
export class Storage {
    store;
    constructor() {
        this.store = [];
    }
    /// Private method for iterating across allocated slots
    *_iter() {
        let idx = 0;
        for (const slot of this.store) {
            if (slot)
                yield [idx, slot];
            idx += 1;
        }
    }
    /// Iterates across each stored component, and their entities
    *iter() {
        for (const [idx, [gen, value]] of this._iter()) {
            yield [entity_new(idx, gen), value];
        }
    }
    /// Finds values with the matching component
    *find(func) {
        for (const [idx, [gen, value]] of this._iter()) {
            if (func(value))
                yield entity_new(idx, gen);
        }
    }
    /// Iterates across each stored component
    *values() {
        for (const [, [, value]] of this._iter()) {
            yield value;
        }
    }
    /** Checks if the component associated with this entity exists @param {Entity} entity */
    contains(entity) {
        return this.get(entity) != null;
    }
    /// Fetches the component for this entity, if it exists
    get(entity) {
        const [id, gen] = entity;
        const val = this.store[id];
        return val && val[0] == gen ? val[1] : null;
    }
    /// Fetches the component, and initializing it if it is missing
    get_or(entity, init) {
        let value = this.get(entity);
        if (!value) {
            value = init();
            this.insert(entity, value);
        }
        return value;
    }
    /// Assigns component to an entity
    insert(entity, component) {
        const [id, gen] = entity;
        const length = this.store.length;
        if (length >= id) {
            this.store.fill(null, length, id);
        }
        this.store[id] = [gen, component];
    }
    /** Check if the storage is empty */
    is_empty() {
        for (const slot of this.store)
            if (slot)
                return false;
        return true;
    }
    /// Removes the component for this entity, if it exists
    remove(entity) {
        const comp = this.get(entity);
        if (comp) {
            this.store[entity[0]] = null;
        }
        return comp;
    }
    /** Takes the component associated with the `entity`, and passes it into the `func` callback @param {Entity} entity @param {function} func */
    take_with(entity, func) {
        const component = this.remove(entity);
        return component ? func(component) : null;
    }
    /// Apply a function to the component when it exists
    with(entity, func) {
        const component = this.get(entity);
        return component ? func(component) : null;
    }
}

/// The world maintains all of the entities, which have their components associated in storages
///
/// # Implementation Notes
///
/// This implementation consists of:
///
/// - An array for storing entities
/// - An array for storing a list of registered storages
/// - An array for containing a list of free slots to allocate
/// - An array for storing tags associated with an entity
export class World {
    entities_;
    storages;
    tags_;
    free_slots;
    constructor() {
        this.entities_ = [];
        this.storages = [];
        this.tags_ = [];
        this.free_slots = new Set();
    }
    /// The total capacity of the entity array
    get capacity() {
        return this.entities_.length;
    }
    /// The number of unallocated entity slots
    get free() {
        return this.free_slots.size;
    }
    /// The number of allocated entities
    get length() {
        return this.capacity - this.free;
    }
    /// Fetches tags associated with an entity
    ///
    /// Tags are essentially a dense set of small components
    tags(entity) {
        return this.tags_[entity[0]];
    }
    /// Iterates across entities in the world
    *entities() {
        for (const entity of this.entities_.values()) {
            if (!this.free_slots.has(entity[0]))
                yield entity;
        }
    }
    /// Create a new entity in the world
    ///
    /// Find the first available slot, and increment the generation.
    create_entity() {
        const slot = this.free_slots.size > 0
            ? this.free_slots.values().next().value
            : undefined;
        if (slot !== undefined) {
            this.free_slots.delete(slot);
            var entity = this.entities_[slot];
            entity[1] += 1;
        }
        else {
            var entity = entity_new(this.capacity, 0);
            this.entities_.push(entity);
            this.tags_.push(new Set());
        }
        return entity;
    }
    /// Deletes an entity from the world
    ///
    /// Sets the `id` of the entity to `null`, thus marking its slot as unused.
    delete_entity(entity) {
        this.tags(entity).clear();
        for (const storage of this.storages) {
            storage.remove(entity);
        }
        this.free_slots.add(entity[0]);
    }
    /// Adds a new tag to the given entity
    add_tag(entity, tag) {
        this.tags(entity).add(tag);
    }
    /// Returns `true` if this tag exists for the given entity
    contains_tag(entity, tag) {
        return this.tags(entity).has(tag);
    }
    /// Deletes a tag from the given entity
    delete_tag(entity, tag) {
        this.tags(entity).delete(tag);
    }
    /// Registers a new component storage for our world
    ///
    /// This will be used to easily remove components when deleting an entity.
    register_storage() {
        const storage = new Storage();
        this.storages.push(storage);
        return storage;
    }
    /// Unregisters an old component storage from our world
    unregister_storage(storage) {
        const matched = this.storages.indexOf(storage);
        if (matched > -1) {
            swap_remove(this.storages, matched);
        }
    }
}
function swap_remove(array, index) {
    array[index] = array[array.length - 1];
    return array.pop();
}

/** A system registers events, and handles their execution. An executor must be provided for registering events onto. */
export class System extends World {
    #executor;
    constructor(executor) {
        super();
        this.#executor = executor;
    }
    /** Registers an event to be executed in the event loop */
    register(event) {
        this.#executor.wake(this, event);
    }
    /** Executs an event on the system */
    run(_event) { }
}
