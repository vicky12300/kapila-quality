frappe.ui.form.on("Quality Approve", {
    refresh: function(frm) {
        if (!frm.doc.vigilance) return;

        // Step 1: Get Vigilance tags
        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Vigilance",
                name: frm.doc.vigilance
            },
            callback: function(vigilance_res) {
                if (!vigilance_res.message) return;

                let vigilance = vigilance_res.message;
                let all_tags = vigilance.vigilance_tags?.map(t => t.tags) || [];

                if (all_tags.length === 0) {
                    frm.fields_dict.lab_results.$wrapper.html("<p>No Vigilance tags found.</p>");
                    return;
                }

                let remarks_map = {};
                let all_rows = [];

                // 👉 Step 2a: Get Approved tags (with files)
                frappe.call({
                    method: "frappe.client.get_list",
                    args: {
                        doctype: "Quality Approved",
                        filters: { vigilance: frm.doc.vigilance },
                        fields: ["tag_name", "image__pdf"]
                    },
                    callback: function(approved_res) {
                        let approved_map = {};
                        (approved_res.message || []).forEach(r => {
                            approved_map[r.tag_name] = r.image__pdf || null;
                        });

                        // Step 2b: Get Lab Results
                        frappe.call({
                            method: "frappe.client.get_list",
                            args: {
                                doctype: "Lab Result",
                                filters: { vigilance_reference: frm.doc.vigilance },
                                fields: ["name", "tag_name", "lab_remarks"]
                            },
                            callback: function(lab_list_res) {
                                let lab_docs = lab_list_res.message || [];

                                if (lab_docs.length === 0) {
                                    render_table(frm, all_tags, [], {}, approved_map);
                                    return;
                                }

                                // Step 3: Fetch each Lab Result fully
                                let calls = [];
                                lab_docs.forEach(doc => {
                                    calls.push(
                                        frappe.call({
                                            method: "frappe.client.get",
                                            args: { doctype: "Lab Result", name: doc.name },
                                            callback: function(lab_res) {
                                                if (lab_res.message) {
                                                    let lab = lab_res.message;
                                                    remarks_map[lab.tag_name] = lab.lab_remarks || "";

                                                    (lab.parameter_ratings || []).forEach(c => {
                                                        all_rows.push({
                                                            tag_name: lab.tag_name,
                                                            parameter_name: c.parameter_name,
                                                            value: c.expected_value || "-"
                                                        });
                                                    });
                                                }
                                            }
                                        })
                                    );
                                });

                                Promise.all(calls.map(p => p)).then(() => {
                                    render_table(frm, all_tags, all_rows, remarks_map, approved_map);
                                });
                            }
                        });
                    }
                });
            }
        });

        // Render Table
        function render_table(frm, tags, all_rows, remarks_map, approved_map) {
            let parameters = [...new Set(all_rows.map(r => r.parameter_name))];

            let html = `<table class="table table-bordered table-striped table-hover" style="width:90%; margin-top:10px;">`;

            // Header
            html += `<thead><tr><th>Parameter</th>`;
            tags.forEach(tag => html += `<th>${tag}</th>`);
            html += `</tr></thead><tbody>`;

            // Parameters
            parameters.forEach(param => {
                html += `<tr><td>${param}</td>`;
                tags.forEach(tag => {
                    let match = all_rows.find(r => r.tag_name === tag && r.parameter_name === param);
                    html += `<td>${match ? match.value : "-"}</td>`;
                });
                html += `</tr>`;
            });

            // Remarks
            html += `<tr><td><b>Lab Remarks</b></td>`;
            tags.forEach(tag => html += `<td>${remarks_map[tag] || ""}</td>`);
            html += `</tr>`;

            // Action Row
            html += `<tr><td><b>Action</b></td>`;
            tags.forEach(tag => {
                if (all_rows.some(r => r.tag_name === tag)) {
                    let attachment = approved_map[tag];

                    if (tag in approved_map) {
                        // Already approved
                        html += `<td>
                                    <span class="text-success">✅ Approved</span><br>`;
                        if (attachment) {
                            html += `<a href="${attachment}" target="_blank">📂 View File</a><br>`;
                        }
                        html += `<button class="btn btn-sm btn-secondary upload-file" data-tag="${tag}">📎 ${attachment ? "Re-upload" : "Upload"}</button>
                                 </td>`;
                    } else {
                        // Not approved yet
                        html += `<td>
                                    <button class="btn btn-primary btn-sm approve-tag" data-tag="${tag}">Approve</button>
                                    <br><button class="btn btn-sm btn-secondary upload-file" data-tag="${tag}">📎 Upload</button>
                                 </td>`;
                    }
                } else {
                    html += `<td>-</td>`;
                }
            });
            html += `</tr>`;

            html += `</tbody></table>`;

            frm.fields_dict.lab_results.$wrapper.html(html);

            // Events
            frm.fields_dict.lab_results.$wrapper.find(".approve-tag").click(function() {
                let tag_name = $(this).data("tag");
                approve_tag(frm, tag_name);
            });

            frm.fields_dict.lab_results.$wrapper.find(".upload-file").click(function() {
                let tag_name = $(this).data("tag");
                upload_file(frm, tag_name);
            });
        }

        // Approve (✅ always works, no file required)
        function approve_tag(frm, tag_name) {
            frappe.call({
                method: "frappe.client.insert",
                args: {
                    doc: {
                        doctype: "Quality Approved",
                        vigilance: frm.doc.vigilance,
                        tag_name: tag_name,
                        approved_by: frappe.session.user,
                        approval_date: frappe.datetime.now_datetime()
                    }
                },
                callback: function(r) {
                    if (r.message) {
                        frappe.msgprint(`Tag ${tag_name} approved successfully.`);
                        frm.reload_doc();
                    }
                }
            });
        }

        // Upload (📎 optional, before/after approval)
        function upload_file(frm, tag_name) {
            new frappe.ui.FileUploader({
                folder: "Home/Attachments",
                allow_multiple: false,
                on_success(file) {
                    frappe.call({
                        method: "frappe.client.get_list",
                        args: {
                            doctype: "Quality Approved",
                            filters: { vigilance: frm.doc.vigilance, tag_name: tag_name },
                            fields: ["name"]
                        },
                        callback: function(res) {
                            if (res.message?.length > 0) {
                                // ✅ Update existing (even if already approved)
                                frappe.call({
                                    method: "frappe.db.set_value",
                                    args: {
                                        doctype: "Quality Approved",
                                        name: res.message[0].name,
                                        fieldname: "image__pdf",
                                        value: file.file_url
                                    },
                                    freeze: true,
                                    freeze_message: __("Updating file..."),
                                    callback: function() {
                                        frappe.msgprint(`📎 File uploaded / replaced for Tag ${tag_name}`);
                                        frm.reload_doc();
                                    }
                                });
                            } else {
                                // Create new with file
                                frappe.call({
                                    method: "frappe.client.insert",
                                    args: {
                                        doc: {
                                            doctype: "Quality Approved",
                                            vigilance: frm.doc.vigilance,
                                            tag_name: tag_name,
                                            image__pdf: file.file_url,
                                            approved_by: frappe.session.user,
                                            approval_date: frappe.datetime.now_datetime()
                                        }
                                    },
                                    callback: function() {
                                        frappe.msgprint(`📎 File uploaded for Tag ${tag_name}`);
                                        frm.reload_doc();
                                    }
                                });
                            }
                        }
                    });
                }
            });
        }
    }
});
