"""add_stock_transfers

Revision ID: c3d4e5f6a7b8
Revises: 031bb9b36332
Create Date: 2026-02-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = '031bb9b36332'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create stock_transfers and stock_transfer_lines tables."""
    # Create stock_transfers table
    op.create_table(
        'stock_transfers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('transfer_number', sa.String(20), nullable=False),
        sa.Column('source_warehouse_id', sa.Integer(), nullable=False),
        sa.Column('destination_warehouse_id', sa.Integer(), nullable=False),
        sa.Column('transfer_type', sa.String(20), nullable=False),  # 'material' or 'finished_good'
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        sa.Column('transfer_date', sa.Date(), nullable=False),
        sa.Column('requested_by', sa.String(100), nullable=True),
        sa.Column('approved_by', sa.String(100), nullable=True),
        sa.Column('completed_by', sa.String(100), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['source_warehouse_id'], ['warehouses.id']),
        sa.ForeignKeyConstraint(['destination_warehouse_id'], ['warehouses.id']),
        sa.UniqueConstraint('transfer_number'),
    )
    op.create_index('ix_stock_transfers_status', 'stock_transfers', ['status'])
    op.create_index('ix_stock_transfers_transfer_date', 'stock_transfers', ['transfer_date'])
    op.create_index('ix_stock_transfers_source', 'stock_transfers', ['source_warehouse_id'])
    op.create_index('ix_stock_transfers_destination', 'stock_transfers', ['destination_warehouse_id'])

    # Create stock_transfer_lines table
    op.create_table(
        'stock_transfer_lines',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('transfer_id', sa.Integer(), nullable=False),
        sa.Column('material_id', sa.Integer(), nullable=True),
        sa.Column('finished_good_id', sa.Integer(), nullable=True),
        sa.Column('quantity', sa.Numeric(15, 3), nullable=False),
        sa.Column('unit_of_measure', sa.String(20), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['transfer_id'], ['stock_transfers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['material_id'], ['materials.id']),
        sa.ForeignKeyConstraint(['finished_good_id'], ['finished_goods.id']),
    )
    op.create_index('ix_stock_transfer_lines_transfer_id', 'stock_transfer_lines', ['transfer_id'])


def downgrade() -> None:
    """Drop stock transfer tables."""
    op.drop_index('ix_stock_transfer_lines_transfer_id', table_name='stock_transfer_lines')
    op.drop_table('stock_transfer_lines')
    op.drop_index('ix_stock_transfers_destination', table_name='stock_transfers')
    op.drop_index('ix_stock_transfers_source', table_name='stock_transfers')
    op.drop_index('ix_stock_transfers_transfer_date', table_name='stock_transfers')
    op.drop_index('ix_stock_transfers_status', table_name='stock_transfers')
    op.drop_table('stock_transfers')
