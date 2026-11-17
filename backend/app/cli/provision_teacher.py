"""Administrative CLI to provision or promote teacher accounts.

Usage:
    python -m app.cli.provision_teacher --email teacher@university.edu
    python -m app.cli.provision_teacher --email new.teacher@university.edu --name "Dr. Smith" --password "SecurePass123!"
"""

import argparse
import getpass
import sys
from sqlalchemy.orm import Session
from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.user import User


def provision_teacher(
    email: str,
    full_name: str | None = None,
    password: str | None = None,
    db: Session | None = None,
):
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True
    try:
        normalized_email = email.strip().lower()
        user = db.query(User).filter(User.email == normalized_email).first()

        if user:
            user.system_role = "teacher"
            db.commit()
            db.refresh(user)
            print(f"Success: Existing user '{user.email}' (ID: {user.id}) promoted to teacher.")
            return user

        if not full_name:
            print("Error: User does not exist. To create a new teacher, provide --name.")
            if should_close:
                sys.exit(1)
            else:
                raise ValueError("User does not exist. Provide name to create new teacher.")

        if not password:
            # Interactive secure password entry with no echo
            try:
                pw1 = getpass.getpass("Enter initial password for new teacher: ")
                pw2 = getpass.getpass("Confirm password: ")
                if pw1 != pw2:
                    print("Error: Passwords do not match.")
                    if should_close:
                        sys.exit(1)
                    else:
                        raise ValueError("Passwords do not match.")
                if len(pw1) < 8:
                    print("Error: Password must be at least 8 characters.")
                    if should_close:
                        sys.exit(1)
                    else:
                        raise ValueError("Password must be at least 8 characters.")
                password = pw1
            except (EOFError, KeyboardInterrupt):
                print("\nOperation cancelled.")
                if should_close:
                    sys.exit(1)
                else:
                    raise

        hashed_pw = get_password_hash(password)
        new_teacher = User(
            full_name=full_name.strip(),
            email=normalized_email,
            hashed_password=hashed_pw,
            system_role="teacher",
        )
        db.add(new_teacher)
        db.commit()
        db.refresh(new_teacher)
        print(f"Success: New teacher account created for '{new_teacher.email}' (ID: {new_teacher.id}).")
        return new_teacher
    finally:
        if should_close:
            db.close()


def main():
    parser = argparse.ArgumentParser(
        description="Provision or promote academic teacher accounts (secure no-echo interactive password entry)."
    )
    parser.add_argument("--email", required=True, help="Institutional email of the teacher")
    parser.add_argument("--name", help="Full name of teacher if creating a new account")

    args = parser.parse_args()
    provision_teacher(email=args.email, full_name=args.name)


if __name__ == "__main__":
    main()
