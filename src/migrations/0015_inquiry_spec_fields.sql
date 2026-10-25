-- The specification dropdowns from the redesigned enquiry form.
--
-- A buyer can now say what they want in structured terms rather than in
-- a paragraph: the material, the movement, the hands, the packaging and
-- the delivery window. Each is optional and defaults to empty, so an
-- enquiry that fills none of them is exactly as valid as it was before.
--
-- Stored as columns rather than folded into the message text so the
-- factory can filter and count them: "how many enquiries asked for a
-- radio-controlled movement" is a question worth being able to answer.
ALTER TABLE inquiries ADD COLUMN material TEXT DEFAULT '';
ALTER TABLE inquiries ADD COLUMN movement TEXT DEFAULT '';
ALTER TABLE inquiries ADD COLUMN hands TEXT DEFAULT '';
ALTER TABLE inquiries ADD COLUMN packaging TEXT DEFAULT '';
ALTER TABLE inquiries ADD COLUMN timeline TEXT DEFAULT '';
