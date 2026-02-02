"""add_is_active_to_contractors

Revision ID: 031bb9b36332
Revises: b2c3d4e5f6a7
Create Date: 2026-02-02 16:08:44.836725

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '031bb9b36332'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add is_active column to contractors with default True
    op.add_column('contractors', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))
    # Remove the server_default after setting the column
    op.alter_column('contractors', 'is_active', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('contractors', 'is_active')
