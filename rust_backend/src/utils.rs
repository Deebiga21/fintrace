/// Reduce a client-supplied upload filename to a safe basename.
///
/// Keeps only the final path component (defeats `../` traversal regardless of
/// whether the request was built on POSIX or Windows) and replaces characters
/// that could break filesystem paths or downstream UI rendering.
pub fn sanitize_upload_filename(raw: &str) -> String {
    let base = raw.rsplit(|c| c == '/' || c == '\\').next().unwrap_or(raw);

    let mut cleaned: String = base
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_') {
                c
            } else {
                '_'
            }
        })
        .take(120)
        .collect();

    // Leading dots would create a hidden file, and a bare "." / ".." is not a real name.
    while cleaned.starts_with('.') {
        cleaned.remove(0);
    }

    if cleaned.is_empty() {
        "upload.csv".to_string()
    } else {
        cleaned
    }
}

#[cfg(test)]
mod tests {
    use super::sanitize_upload_filename;

    #[test]
    fn strips_directory_components() {
        assert_eq!(sanitize_upload_filename("../../etc/passwd"), "passwd");
        assert_eq!(
            sanitize_upload_filename("..\\..\\windows\\system32\\evil.csv"),
            "evil.csv"
        );
        assert_eq!(
            sanitize_upload_filename("/var/tmp/transactions.csv"),
            "transactions.csv"
        );
    }

    #[test]
    fn keeps_ordinary_names() {
        assert_eq!(
            sanitize_upload_filename("txns_2026-01.csv"),
            "txns_2026-01.csv"
        );
        assert_eq!(
            sanitize_upload_filename("July Statement.csv"),
            "July_Statement.csv"
        );
    }

    #[test]
    fn falls_back_for_empty_or_dot_names() {
        assert_eq!(sanitize_upload_filename(""), "upload.csv");
        assert_eq!(sanitize_upload_filename(".."), "upload.csv");
        assert_eq!(sanitize_upload_filename("..."), "upload.csv");
    }
}
