try:
    if __name__ == "__main__":
        __import__('math').sum([int(input("Enter first number: ")), int(input("Enter second number: "))])
except Exception as e:
    print(f"Error occurred: {e}")