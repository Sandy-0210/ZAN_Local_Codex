import time
try:
    if __name__ == "__main__":
        num1 = int(input("Enter first number: "))
        num2 = int(input("Enter second number: "))
        print(f"The sum is: {num1} + {num2} = {num1+num2}")
    except Exception as e:
        print(f"Error occurred: {e}")
else:
    print("Invalid input. Please enter numbers only.")