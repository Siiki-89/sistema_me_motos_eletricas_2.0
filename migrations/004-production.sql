CREATE TABLE production_record (
 orderId TEXT PRIMARY KEY REFERENCES production_order(id),
 unitId TEXT NOT NULL UNIQUE REFERENCES unit(id),
 version INTEGER NOT NULL CHECK(version>=1),
 productionStatus TEXT NOT NULL CHECK(productionStatus IN ('WAITING','UNPACKING','ASSEMBLING','PAUSED','ASSEMBLED')),
 selfCheck TEXT NOT NULL CHECK(json_valid(selfCheck))
) STRICT;
CREATE TABLE production_stage (
 id TEXT PRIMARY KEY,
 orderId TEXT NOT NULL REFERENCES production_record(orderId),
 kind TEXT NOT NULL CHECK(kind IN ('UNPACKING','ASSEMBLY','REWORK')),
 data TEXT NOT NULL CHECK(json_valid(data)),
 UNIQUE(orderId,id)
) STRICT;
CREATE UNIQUE INDEX production_primary_stage ON production_stage(orderId,kind) WHERE kind!='REWORK';
CREATE TABLE production_occurrence (
 id TEXT PRIMARY KEY,
 orderId TEXT NOT NULL REFERENCES production_record(orderId),
 stageId TEXT,
 data TEXT NOT NULL CHECK(json_valid(data)),
 FOREIGN KEY(orderId,stageId) REFERENCES production_stage(orderId,id)
) STRICT;
CREATE TRIGGER production_record_unit BEFORE INSERT ON production_record
WHEN NOT EXISTS(SELECT 1 FROM production_order o WHERE o.id=NEW.orderId AND o.unitId=NEW.unitId)
BEGIN SELECT RAISE(ABORT,'production unit must belong to order'); END;
CREATE TRIGGER production_record_identity BEFORE UPDATE OF unitId,orderId ON production_record
WHEN NEW.unitId!=OLD.unitId OR NEW.orderId!=OLD.orderId
BEGIN SELECT RAISE(ABORT,'production identity is immutable'); END;
CREATE INDEX production_occurrence_order ON production_occurrence(orderId);
CREATE TABLE production_history (
 id TEXT PRIMARY KEY,
 orderId TEXT NOT NULL REFERENCES production_record(orderId),
 actorId TEXT NOT NULL REFERENCES actor(id),
 kind TEXT NOT NULL,
 reason TEXT,
 createdAt TEXT NOT NULL,
 beforeData TEXT NOT NULL CHECK(json_valid(beforeData)),
 afterData TEXT NOT NULL CHECK(json_valid(afterData))
) STRICT;
