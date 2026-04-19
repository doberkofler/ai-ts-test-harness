# PL/SQL problem notes

These problems are validated with static tests (pattern checks), not by executing against a live Oracle instance.

## Shared schema assumptions

- `orders(order_id, customer_id, status, created_at, order_total)`
- `customers(customer_id, status, last_order_date)`
- `audit_log(order_id, changed_at, reason)`
- `product_audit(product_id, column_name, old_value, new_value, changed_by, changed_at)`
- `error_log(proc_name, error_code, error_msg, logged_at)`
- `employees(employee_id, first_name, last_name, email, department_id)` for pipelined function

## Trigger-specific assumptions

For `trigger-audit-trail-on-update`, the `products` table is assumed to contain:

- `product_name`
- `description`
- `price`
- `status`
- `stock_qty`

The trigger is expected to audit changes for each of those columns.
