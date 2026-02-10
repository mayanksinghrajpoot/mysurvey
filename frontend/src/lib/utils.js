import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Helper to recursively flatten Form.io components
export function flattenComponents(components) {
  let flat = [];
  if (!components || !Array.isArray(components)) return flat;

  components.forEach(c => {
    flat.push(c);
    if (c.components) {
      flat = flat.concat(flattenComponents(c.components));
    }
    if (c.columns) {
      c.columns.forEach(col => {
        if (col.components) {
          flat = flat.concat(flattenComponents(col.components));
        }
      });
    }
    if (c.rows) {
      c.rows.forEach(row => {
        if (Array.isArray(row)) {
          row.forEach(cell => {
            if (cell.components) {
              flat = flat.concat(flattenComponents(cell.components));
            }
          });
        }
      });
    }
    // Handle Panel or other containers that might have 'components' but are not columns/rows
    // (Already covered by c.components check above if they use that standard property)
  });

  return flat;
}
