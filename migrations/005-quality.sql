-- 005: Inspeção de qualidade da unidade, independente da OP administrativa e da montagem.
CREATE TABLE quality_record (
 orderId TEXT PRIMARY KEY REFERENCES production_order(id),
 unitId TEXT NOT NULL REFERENCES unit(id),
 version INTEGER NOT NULL CHECK(version >= 1),
 status TEXT NOT NULL CHECK(status IN ('DRAFT','APPROVED','REJECTED')),
 productionVersion INTEGER NOT NULL CHECK(productionVersion >= 0),
 checker TEXT,
 staticAnswers TEXT NOT NULL CHECK(json_valid(staticAnswers)),
 roadAnswers TEXT NOT NULL CHECK(json_valid(roadAnswers)),
 notes TEXT,
 updatedAt TEXT NOT NULL
) STRICT;
CREATE INDEX quality_unit ON quality_record(unitId);
CREATE TABLE quality_event (
 id TEXT PRIMARY KEY,
 orderId TEXT NOT NULL REFERENCES quality_record(orderId),
 actorId TEXT NOT NULL REFERENCES actor(id),
 action TEXT NOT NULL CHECK(action IN ('SAVED','APPROVED','REJECTED','REOPENED')),
 reason TEXT,
 beforeData TEXT CHECK(beforeData IS NULL OR json_valid(beforeData)),
 afterData TEXT NOT NULL CHECK(json_valid(afterData)),
 createdAt TEXT NOT NULL
) STRICT;
CREATE INDEX quality_event_order ON quality_event(orderId,createdAt,id);
CREATE TRIGGER quality_unit_match BEFORE INSERT ON quality_record
WHEN NOT EXISTS(SELECT 1 FROM production_order WHERE id=NEW.orderId AND unitId=NEW.unitId)
BEGIN SELECT RAISE(ABORT,'quality unit must belong to order'); END;
CREATE TRIGGER quality_identity_immutable BEFORE UPDATE OF orderId,unitId ON quality_record
BEGIN SELECT RAISE(ABORT,'quality identity immutable'); END;
CREATE TRIGGER quality_event_no_update BEFORE UPDATE ON quality_event
BEGIN SELECT RAISE(ABORT,'quality audit is immutable'); END;
CREATE TRIGGER quality_event_no_delete BEFORE DELETE ON quality_event
BEGIN SELECT RAISE(ABORT,'quality audit is immutable'); END;
