import frappe
from frappe.model.document import Document

class LabResult(Document):
    def on_update(self):
        self.create_or_update_quality()

    def create_or_update_quality(self):
        if not self.vigilance_reference:
            return

        # get vigilance doc
        vigilance = frappe.get_doc("Vigilance", self.vigilance_reference)

        print("here :: " , vigilance)
        # check if Quality doc already exists for this vigilance
        quality = frappe.db.exists("Quality Approve", {"vigilance": self.vigilance_reference})
        
        if quality:
            # update existing
            quality_doc = frappe.get_doc("Quality Approve", quality)
        else:
            # create new
            quality_doc = frappe.new_doc("Quality Approve")
            quality_doc.vigilance = self.vigilance_reference

        # map fields
        quality_doc.token = vigilance.token
        quality_doc.supplier_name = vigilance.supplier_name
        quality_doc.material = vigilance.material
        quality_doc.arrived_at = vigilance.token_date

        # save or update
        quality_doc.save(ignore_permissions=True)

        frappe.msgprint(
            f"Quality document {'updated' if quality else 'created'} for Vigilance {self.vigilance_reference}"
        )



@frappe.whitelist()
def get_details_from_tag(tag_name):
    # Find Vigilance where child table "Vigilance Tags" has this tag_name
    tag_row = frappe.db.get_value(
        "Vigilance Tags",
        {"tags": tag_name},
        ["parent"],
        as_dict=True
    )

    if not tag_row:
        return None   # No record found

    vigilance = frappe.get_doc("Vigilance", tag_row.parent)
    material = vigilance.material

    parameters = []
    if material:
        item_doc = frappe.get_doc("Item", material)
        for p in item_doc.custom_quality_parameter_details:
            parameters.append({
                "parameter": p.parameter_name,
                "parameter_name": p.parameter_name,
            })

    return {
        "material": material,
        "parameters": parameters,
        "vigilance_reference":tag_row.parent
    }
