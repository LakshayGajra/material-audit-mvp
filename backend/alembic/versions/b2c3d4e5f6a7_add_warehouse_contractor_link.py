"""Add warehouse contractor link and unified inventory

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2024-02-02

Changes:
- Add owner_type, contractor_id, can_hold_materials, can_hold_finished_goods to warehouses
- Add warehouse_id to contractor model for default warehouse
- Migrate existing contractor_inventory to warehouse-based inventory
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to warehouses table
    op.add_column('warehouses', sa.Column('owner_type', sa.String(20), nullable=False, server_default='company'))
    op.add_column('warehouses', sa.Column('contractor_id', sa.Integer(), sa.ForeignKey('contractors.id'), nullable=True))
    op.add_column('warehouses', sa.Column('can_hold_materials', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('warehouses', sa.Column('can_hold_finished_goods', sa.Boolean(), nullable=False, server_default='true'))

    # Create index for contractor_id
    op.create_index('ix_warehouses_contractor_id', 'warehouses', ['contractor_id'])
    op.create_index('ix_warehouses_owner_type', 'warehouses', ['owner_type'])

    # Add default_warehouse_id to contractors (optional, for quick lookup)
    op.add_column('contractors', sa.Column('default_warehouse_id', sa.Integer(), sa.ForeignKey('warehouses.id'), nullable=True))

    # Create warehouses for existing contractors and migrate their inventory
    # This is done in a data migration step
    connection = op.get_bind()

    # Get all contractors
    contractors = connection.execute(sa.text("SELECT id, code, name FROM contractors")).fetchall()

    for contractor in contractors:
        contractor_id, code, name = contractor

        # Create a warehouse for this contractor
        warehouse_code = f"WH-{code}"
        warehouse_name = f"{name} Warehouse"

        # Check if warehouse already exists
        existing = connection.execute(
            sa.text("SELECT id FROM warehouses WHERE code = :code"),
            {"code": warehouse_code}
        ).fetchone()

        if existing:
            warehouse_id = existing[0]
            # Update to link to contractor
            connection.execute(
                sa.text("""
                    UPDATE warehouses
                    SET owner_type = 'contractor', contractor_id = :contractor_id
                    WHERE id = :warehouse_id
                """),
                {"contractor_id": contractor_id, "warehouse_id": warehouse_id}
            )
        else:
            # Create new warehouse
            connection.execute(
                sa.text("""
                    INSERT INTO warehouses (code, name, owner_type, contractor_id, can_hold_materials, can_hold_finished_goods, is_active)
                    VALUES (:code, :name, 'contractor', :contractor_id, true, true, true)
                """),
                {"code": warehouse_code, "name": warehouse_name, "contractor_id": contractor_id}
            )

            # Get the new warehouse id
            result = connection.execute(
                sa.text("SELECT id FROM warehouses WHERE code = :code"),
                {"code": warehouse_code}
            ).fetchone()
            warehouse_id = result[0]

        # Update contractor with default warehouse
        connection.execute(
            sa.text("UPDATE contractors SET default_warehouse_id = :warehouse_id WHERE id = :contractor_id"),
            {"warehouse_id": warehouse_id, "contractor_id": contractor_id}
        )

        # Migrate contractor_inventory to warehouse_inventory
        inventory_items = connection.execute(
            sa.text("""
                SELECT material_id, quantity
                FROM contractor_inventory
                WHERE contractor_id = :contractor_id AND quantity > 0
            """),
            {"contractor_id": contractor_id}
        ).fetchall()

        for item in inventory_items:
            material_id, quantity = item

            # Get material unit
            material = connection.execute(
                sa.text("SELECT unit FROM materials WHERE id = :id"),
                {"id": material_id}
            ).fetchone()
            unit = material[0] if material else 'unit'

            # Check if already exists in warehouse_inventory
            existing_inv = connection.execute(
                sa.text("""
                    SELECT id, current_quantity FROM warehouse_inventory
                    WHERE warehouse_id = :warehouse_id AND material_id = :material_id
                """),
                {"warehouse_id": warehouse_id, "material_id": material_id}
            ).fetchone()

            if existing_inv:
                # Update existing
                new_qty = float(existing_inv[1]) + float(quantity)
                connection.execute(
                    sa.text("""
                        UPDATE warehouse_inventory
                        SET current_quantity = :qty
                        WHERE id = :id
                    """),
                    {"qty": new_qty, "id": existing_inv[0]}
                )
            else:
                # Insert new
                connection.execute(
                    sa.text("""
                        INSERT INTO warehouse_inventory (warehouse_id, material_id, current_quantity, unit_of_measure, reorder_point, reorder_quantity)
                        VALUES (:warehouse_id, :material_id, :quantity, :unit, 0, 0)
                    """),
                    {"warehouse_id": warehouse_id, "material_id": material_id, "quantity": quantity, "unit": unit}
                )


def downgrade():
    # Remove indexes
    op.drop_index('ix_warehouses_contractor_id', table_name='warehouses')
    op.drop_index('ix_warehouses_owner_type', table_name='warehouses')

    # Remove columns from contractors
    op.drop_column('contractors', 'default_warehouse_id')

    # Remove columns from warehouses
    op.drop_column('warehouses', 'can_hold_finished_goods')
    op.drop_column('warehouses', 'can_hold_materials')
    op.drop_column('warehouses', 'contractor_id')
    op.drop_column('warehouses', 'owner_type')
