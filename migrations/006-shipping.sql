CREATE TABLE shipment (
 id TEXT PRIMARY KEY,
 orderId TEXT NOT NULL REFERENCES production_order(id),
 unitId TEXT NOT NULL UNIQUE REFERENCES unit(id),
 status TEXT NOT NULL CHECK(status IN('SHIPPED','RECEIVED','RECEIVED_WITH_REMARKS')),
 driver TEXT NOT NULL,
 destination TEXT NOT NULL,
 dispatchedAt TEXT NOT NULL,
 receivedAt TEXT,
 receivedBy TEXT,
 remarks TEXT,
 accessoriesChecked INTEGER NOT NULL CHECK(accessoriesChecked IN(0,1)),
 createdAt TEXT NOT NULL,
 updatedAt TEXT NOT NULL,
 version INTEGER NOT NULL CHECK(version>0),
 UNIQUE(orderId,unitId)
) STRICT;
CREATE TABLE shipment_event (
 id TEXT PRIMARY KEY,
 shipmentId TEXT NOT NULL REFERENCES shipment(id),
 actorId TEXT NOT NULL REFERENCES actor(id),
 kind TEXT NOT NULL CHECK(kind IN('DISPATCHED','RECEIVED','RECEIVED_WITH_REMARKS')),
 reason TEXT,
 createdAt TEXT NOT NULL,
 data TEXT NOT NULL CHECK(json_valid(data))
) STRICT;
CREATE INDEX shipment_event_shipment ON shipment_event(shipmentId,createdAt);
CREATE TRIGGER shipment_unit_match BEFORE INSERT ON shipment
WHEN NOT EXISTS(SELECT 1 FROM production_order WHERE id=NEW.orderId AND unitId=NEW.unitId)
BEGIN SELECT RAISE(ABORT,'shipment mismatch'); END;
CREATE TRIGGER shipment_no_delete BEFORE DELETE ON shipment BEGIN SELECT RAISE(ABORT,'shipment cannot be deleted'); END;
CREATE TRIGGER shipment_identity_immutable BEFORE UPDATE OF id,orderId,unitId ON shipment BEGIN SELECT RAISE(ABORT,'shipment identity immutable'); END;
CREATE TRIGGER shipment_event_no_delete BEFORE DELETE ON shipment_event BEGIN SELECT RAISE(ABORT,'shipment event cannot be deleted'); END;
