CREATE TABLE part_catalog (
 id TEXT PRIMARY KEY,
 code TEXT NOT NULL COLLATE NOCASE UNIQUE,
 name TEXT NOT NULL,
 category TEXT NOT NULL CHECK(category IN('PECA','BATERIA','CONTROLADORA','ACESSORIO','OUTRO')),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),
 createdAt TEXT NOT NULL
) STRICT;
CREATE TABLE part_movement (
 id TEXT PRIMARY KEY,
 partId TEXT NOT NULL REFERENCES part_catalog(id),
 kind TEXT NOT NULL CHECK(kind IN('RECEIPT','BOX_EXTRA','TRANSFER','CONSUMPTION','ADJUST')),
 quantity INTEGER NOT NULL CHECK(quantity>0),
 sourceLocation TEXT,
 destinationLocation TEXT,
 sourceUnitId TEXT REFERENCES unit(id),
 reason TEXT,
 effectiveDate TEXT NOT NULL,
 actorId TEXT NOT NULL REFERENCES actor(id),
 createdAt TEXT NOT NULL,
 CHECK(sourceLocation IS NOT NULL OR destinationLocation IS NOT NULL),
 CHECK(sourceLocation IS NULL OR destinationLocation IS NULL OR sourceLocation <> destinationLocation),
 CHECK(kind<>'BOX_EXTRA' OR (sourceUnitId IS NOT NULL AND sourceLocation IS NULL AND destinationLocation='UNIT:'||sourceUnitId))
) STRICT;
CREATE INDEX part_movement_part ON part_movement(partId,createdAt,id);
CREATE INDEX part_movement_locations ON part_movement(partId,sourceLocation,destinationLocation);
CREATE TRIGGER part_movement_no_update BEFORE UPDATE ON part_movement BEGIN SELECT RAISE(ABORT,'part movements are immutable'); END;
CREATE TRIGGER part_movement_no_delete BEFORE DELETE ON part_movement BEGIN SELECT RAISE(ABORT,'part movements are immutable'); END;
CREATE TRIGGER part_stock_guard BEFORE INSERT ON part_movement
WHEN NEW.sourceLocation IS NOT NULL AND (
 SELECT COALESCE(SUM(CASE WHEN destinationLocation=NEW.sourceLocation THEN quantity ELSE 0 END)-
 SUM(CASE WHEN sourceLocation=NEW.sourceLocation THEN quantity ELSE 0 END),0)
 FROM part_movement WHERE partId=NEW.partId
)<NEW.quantity
BEGIN SELECT RAISE(ABORT,'insufficient part stock'); END;
