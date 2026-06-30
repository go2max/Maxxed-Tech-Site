-- Repeatable commerce seed data for Maxxed admin D1.
-- Use after migrations have created commerce tables.

INSERT INTO commerce_groups (id,slug,name,buyer_type,purchase_mode,description,created_at,updated_at) VALUES
('group_business','business','Maxxed Business Tools','business','business_workspace','Business-facing request, ticket, client, quote, plugin, and admin tools with business, seat, and usage billing.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('group_plugins','plugins','Plugin Tools','individual_or_business','standalone_or_bundle','Individual plugins, small plugin bundles, and business-suite inclusions. Plugins are an acquisition channel, not a single forced suite.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('group_field','field','Field Tools','individual','standalone_first','Niche field apps stay individually purchasable first because each buyer segment is different.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('group_career','career','Career Tools','individual','standalone_or_bundle','Job search, tracking, clipper, resume, interview, and follow-up workflows.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('group_utility','utility','Everyday Utilities','individual','standalone_or_pass','Remote, compass, measure, cleanup, and practical device utilities.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,buyer_type=excluded.buyer_type,purchase_mode=excluded.purchase_mode,description=excluded.description,updated_at=CURRENT_TIMESTAMP;

INSERT INTO usage_meters (id,meter_key,label,unit,warning_threshold,critical_threshold,status,created_at) VALUES
('meter_actions','actions','Product actions','action',0.7,0.85,'active',CURRENT_TIMESTAMP),
('meter_storage_gb','storage_gb','Storage','GB',0.7,0.85,'active',CURRENT_TIMESTAMP),
('meter_seats','seats','Seats','seat',0.8,0.95,'active',CURRENT_TIMESTAMP),
('meter_uploads','uploads','Uploads','upload',0.7,0.85,'active',CURRENT_TIMESTAMP),
('meter_exports','exports','Exports','export',0.75,0.9,'active',CURRENT_TIMESTAMP)
ON CONFLICT(meter_key) DO UPDATE SET label=excluded.label,unit=excluded.unit,warning_threshold=excluded.warning_threshold,critical_threshold=excluded.critical_threshold,status=excluded.status;
