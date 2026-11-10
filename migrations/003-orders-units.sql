CREATE TABLE order_sequence(id INTEGER PRIMARY KEY CHECK(id=1), value INTEGER NOT NULL) STRICT;
INSERT INTO order_sequence VALUES(1,0);
CREATE TABLE production_order(
 id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, type TEXT NOT NULL CHECK(type IN('INITIAL','EXISTING_UNIT')),
 variantId TEXT NOT NULL REFERENCES variant(id), originId TEXT NOT NULL REFERENCES box_origin(id),
 meCode TEXT NOT NULL, commercialName TEXT, color TEXT, orderDate TEXT NOT NULL,
 unpacker TEXT, mechanic TEXT, checker TEXT, destination TEXT, notes TEXT,
 status TEXT NOT NULL CHECK(status IN('RESERVED','TRANSCRIBING','IN_PROGRESS','COMPLETED','CANCELLED')),
 unitId TEXT REFERENCES unit(id), version INTEGER NOT NULL CHECK(version>0), createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
 regularizesOrderId TEXT REFERENCES production_order(id), UNIQUE(id,originId,variantId)
) STRICT;
CREATE UNIQUE INDEX order_active_unit ON production_order(unitId) WHERE unitId IS NOT NULL AND status NOT IN('COMPLETED','CANCELLED');
CREATE TABLE reservation(id TEXT PRIMARY KEY,orderId TEXT NOT NULL UNIQUE,originId TEXT NOT NULL,variantId TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN('active','consumed','released')),createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL,
 FOREIGN KEY(orderId,originId,variantId) REFERENCES production_order(id,originId,variantId)) STRICT;
CREATE TABLE unit(id TEXT PRIMARY KEY,variantId TEXT NOT NULL REFERENCES variant(id),meCode TEXT NOT NULL,commercialName TEXT,color TEXT,chassis TEXT COLLATE NOCASE UNIQUE,
 originId TEXT NOT NULL REFERENCES box_origin(id),originOrderId TEXT NOT NULL UNIQUE,createdAt TEXT NOT NULL,
 productionStatus TEXT NOT NULL CHECK(productionStatus='WAITING'),qualityStatus TEXT NOT NULL CHECK(qualityStatus='PENDING'),location TEXT NOT NULL CHECK(location='GALPAO'),chassisOriginal TEXT,
 FOREIGN KEY(originOrderId,originId,variantId) REFERENCES production_order(id,originId,variantId),UNIQUE(id,originOrderId,originId)) STRICT;
CREATE TABLE box_conversion(id TEXT PRIMARY KEY,originId TEXT NOT NULL REFERENCES box_origin(id),quantity INTEGER NOT NULL CHECK(quantity=-1),kind TEXT NOT NULL CHECK(kind='conversion'),effectiveDate TEXT NOT NULL,reason TEXT,reversesId TEXT CHECK(reversesId IS NULL),actorId TEXT NOT NULL REFERENCES actor(id),createdAt TEXT NOT NULL,orderId TEXT NOT NULL UNIQUE,unitId TEXT NOT NULL UNIQUE,
 FOREIGN KEY(unitId,orderId,originId) REFERENCES unit(id,originOrderId,originId)) STRICT;
CREATE VIEW box_ledger AS SELECT id,originId,quantity,kind,effectiveDate,reason,reversesId,actorId,createdAt,NULL orderId,NULL unitId FROM box_movement UNION ALL SELECT * FROM box_conversion;
CREATE TABLE box_block(id TEXT PRIMARY KEY,originId TEXT NOT NULL,variantId TEXT NOT NULL,cancelledOrderId TEXT NOT NULL UNIQUE,status TEXT NOT NULL CHECK(status IN('active','regularized','released')),reason TEXT NOT NULL,createdAt TEXT NOT NULL,resolvedAt TEXT,regularizedOrderId TEXT UNIQUE REFERENCES production_order(id),
 FOREIGN KEY(cancelledOrderId,originId,variantId) REFERENCES production_order(id,originId,variantId)) STRICT;
CREATE TABLE order_event(id TEXT PRIMARY KEY,orderId TEXT NOT NULL REFERENCES production_order(id),kind TEXT NOT NULL,actorId TEXT NOT NULL REFERENCES actor(id),reason TEXT,data TEXT NOT NULL,createdAt TEXT NOT NULL) STRICT;
CREATE INDEX reservation_origin ON reservation(originId,status);
CREATE INDEX block_origin ON box_block(originId,status);
CREATE INDEX order_created ON production_order(createdAt,id);
CREATE INDEX event_order ON order_event(orderId,createdAt,id);
CREATE TRIGGER order_origin_check BEFORE INSERT ON production_order WHEN NOT EXISTS(SELECT 1 FROM box_origin WHERE id=NEW.originId AND variantId=NEW.variantId) BEGIN SELECT RAISE(ABORT,'origin variant mismatch'); END;
CREATE TRIGGER unit_identity_immutable BEFORE UPDATE OF id,variantId,originId,originOrderId ON unit BEGIN SELECT RAISE(ABORT,'unit identity immutable'); END;
CREATE TRIGGER unit_no_delete BEFORE DELETE ON unit BEGIN SELECT RAISE(ABORT,'unit cannot be deleted'); END;
CREATE TRIGGER conversion_no_update BEFORE UPDATE ON box_conversion BEGIN SELECT RAISE(ABORT,'conversion immutable'); END;
CREATE TRIGGER conversion_no_delete BEFORE DELETE ON box_conversion BEGIN SELECT RAISE(ABORT,'conversion immutable'); END;
CREATE TRIGGER movement_holds BEFORE INSERT ON box_movement WHEN
 COALESCE((SELECT SUM(quantity) FROM box_ledger WHERE originId=NEW.originId),0)+NEW.quantity
 < (SELECT COUNT(*) FROM reservation WHERE originId=NEW.originId AND status='active')+(SELECT COUNT(*) FROM box_block WHERE originId=NEW.originId AND status='active')
 BEGIN SELECT RAISE(ABORT,'insufficient stock for holds'); END;
CREATE TRIGGER initial_unit_link BEFORE UPDATE OF unitId ON production_order WHEN NEW.type='INITIAL' AND NEW.unitId IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM unit WHERE id=NEW.unitId AND originOrderId=NEW.id AND originId=NEW.originId AND variantId=NEW.variantId)
 BEGIN SELECT RAISE(ABORT,'initial unit mismatch'); END;
CREATE TRIGGER order_identity_immutable BEFORE UPDATE OF id,variantId,originId,code,type ON production_order
 BEGIN SELECT RAISE(ABORT,'order identity immutable'); END;
CREATE TRIGGER reservation_initial BEFORE INSERT ON reservation WHEN NOT EXISTS(SELECT 1 FROM production_order WHERE id=NEW.orderId AND type='INITIAL' AND status='RESERVED')
 BEGIN SELECT RAISE(ABORT,'initial reserved order required'); END;
CREATE TRIGGER reservation_capacity BEFORE INSERT ON reservation WHEN NEW.status='active' AND
 COALESCE((SELECT SUM(quantity) FROM box_ledger WHERE originId=NEW.originId),0)
 <= (SELECT COUNT(*) FROM reservation WHERE originId=NEW.originId AND status='active')+(SELECT COUNT(*) FROM box_block WHERE originId=NEW.originId AND status='active')
 BEGIN SELECT RAISE(ABORT,'insufficient stock for reservation'); END;
CREATE TRIGGER conversion_reservation BEFORE INSERT ON box_conversion WHEN NOT EXISTS(
 SELECT 1 FROM reservation WHERE orderId=NEW.orderId AND originId=NEW.originId AND status='consumed')
 BEGIN SELECT RAISE(ABORT,'consumed reservation required'); END;
CREATE TRIGGER conversion_capacity BEFORE INSERT ON box_conversion WHEN
 COALESCE((SELECT SUM(quantity) FROM box_ledger WHERE originId=NEW.originId),0)-1
 < (SELECT COUNT(*) FROM reservation WHERE originId=NEW.originId AND status='active')+(SELECT COUNT(*) FROM box_block WHERE originId=NEW.originId AND status='active')
 BEGIN SELECT RAISE(ABORT,'insufficient stock for conversion'); END;
